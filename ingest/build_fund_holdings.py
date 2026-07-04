#!/usr/bin/env python3
"""
Fund-level holdings ingest for NV Family Office — "which mutual funds hold my stocks".

This is the bounded, official version of the mutual-fund layer. For a curated set
of the largest fund houses, it downloads each AMC's *official* monthly portfolio
disclosure (the file every AMC must publish under SEBI rules), parses the
SEBI-standard holdings table, and reverse-indexes it onto NV's stocks.

Discovery is done through AdvisorKhoj's form-download-centre, which lists every
AMC's disclosure files with direct links to the AMC's own servers — so the data
is authoritative (AMC files), just discovered through one consistent index.

Output: src/data/fundHolders.json — per NV stock, the notable funds holding it
and their % of the fund. The Positioning screen reads it as a drill-down under
each holding. Re-runnable monthly (files are dated; we take the latest).

Honest scope: this covers the big houses below, not all ~44 AMCs. That's a
transparent, real subset — surfaced in the UI as "notable funds among the major
houses we track", never dressed up as exhaustive.
"""
import io, json, os, re, subprocess, sys, tempfile, time, zipfile
import openpyxl
import xlrd

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# NV's direct-equity book, keyed by ISIN (the real join key across every source).
NV_ISIN = {
    "INE117A01022": "ABB", "INE818A01017": "ANTELOPUS", "INE111A01025": "CONCOR",
    "INE126A01031": "EIDPARRY", "INE1NPP01017": "ENRIN", "INE131A01031": "GMDCLTD",
    "INE517F01014": "GPPL", "INE038A01020": "HINDALCO", "INE335Y01020": "IRCTC",
    "INE797F01020": "JUBLFOOD", "INE018A01030": "LT", "INE584A01023": "NMDC",
    "INE457L01029": "PGEL", "INE081A01020": "TATASTEEL", "INE152A01029": "THERMAX",
    "INE503A01015": "DCBBANK",
}

# Major fund houses, discovered via AdvisorKhoj. (Slug on AdvisorKhoj, display name.)
# These are the largest equity AMCs — the ones that actually hold NV's largecaps.
AMCS = [
    ("SBI-Mutual-Fund", "SBI"),
    ("ICICI-Prudential-Mutual-Fund", "ICICI Prudential"),
    ("Nippon-India-Mutual-Fund", "Nippon India"),
    ("Kotak-Mahindra-Mutual-Fund", "Kotak"),
    ("Axis-Mutual-Fund", "Axis"),
    # UTI omitted — its disclosure listing carries only auxiliary files
    # (Sebi-exposure / futures / risk-o-meter), not the standard per-scheme portfolio.
    ("Aditya-Birla-Sun-Life-Mutual-Fund", "Aditya Birla SL"),
    ("Quant-Mutual-Fund", "Quant"),
    ("Motilal-Oswal-Mutual-Fund", "Motilal Oswal"),
    ("Tata-Mutual-Fund", "Tata"),
]

ISIN_RE = re.compile(r"^IN[EF][0-9A-Z]{9}$")
FILE_RE = re.compile(r'href="([^"]+\.(?:xlsx|xls|zip)(?:\?[^"]*)?)"', re.I)

# Schemes we skip — not "an active fund chose to hold this": pure debt/cash, and
# index/ETF products that hold mechanically. Hybrid/equity active funds are kept.
SKIP = re.compile(
    r"liquid|overnight|money market|ultra[ -]?short|low duration|short duration|"
    r"\bdebt\b|\bbond\b|\bgilt\b|banking (and|&) psu|corporate bond|credit risk|"
    r"dynamic bond|floating|arbitrage|fund of fund|\bfof\b|\betf\b|\bindex\b|"
    r"nifty|sensex|\bg-?sec\b|savings|income",
    re.I,
)


def curl_text(url):
    return subprocess.run(["curl", "-sSL", "-m", "45", "-A", UA, url],
                          capture_output=True, text=True).stdout


def curl_bin(url, path):
    for _ in range(3):
        r = subprocess.run(["curl", "-sSL", "-m", "120", "-A", UA, "-o", path, "-w", "%{http_code}", url],
                           capture_output=True, text=True)
        if r.stdout.strip() == "200" and os.path.exists(path) and os.path.getsize(path) > 1000:
            return True
        time.sleep(2)
    return os.path.exists(path) and os.path.getsize(path) > 1000


def latest_file_url(slug):
    body = curl_text(f"https://www.advisorkhoj.com/form-download-centre/Mutual/{slug}/Monthly-Portfolio-Disclosures")
    files = FILE_RE.findall(body)
    return files[0] if files else None  # AdvisorKhoj lists newest first


def clean_scheme(name):
    s = re.sub(r"\.(xlsx|xls)$", "", str(name), flags=re.I)
    s = re.sub(r"\s*\(.*?\)\s*", " ", s)             # drop "(An Open Ended Equity Scheme)" noise
    s = re.sub(r"\s+as on\b.*$", "", s, flags=re.I)  # drop "as on 31-May-2026" suffix
    s = re.sub(r"[_]+", " ", s).strip()
    return re.sub(r"\s+", " ", s)


def _is_isin_hdr(c):
    return c == "isin" or c.startswith("isin")   # "ISIN" or "ISIN Code" (Kotak)


def sheet_scheme_name(rows, fallback):
    """Best-effort scheme name from a sheet's top rows, across AMC layouts:
    a 'SCHEME NAME :' label (SBI/UTI), a 'Portfolio of <name>' title (Kotak),
    or a '<code> <Name> Fund' cell (Nippon). Falls back to the given name."""
    for row in rows[:6]:
        cells = ["" if c is None else str(c).strip() for c in row]
        low = [c.lower() for c in cells]
        j = next((k for k, c in enumerate(low) if "scheme name" in c), None)
        if j is not None:
            nm = next((cells[k] for k in range(j + 1, len(cells)) if cells[k]), None)
            if nm:
                return clean_scheme(nm)
        for c in cells:
            m = re.match(r"(?:monthly\s+)?portfolio\s+(?:statement\s+)?(?:of\s+)?(?:the\s+)?(.+)", c, re.I)
            if m and "fund" in m.group(1).lower():
                return clean_scheme(m.group(1))
        for c in cells:
            lc = c.lower()
            # A scheme is "<X> Fund", never "<AMC> Mutual Fund" (that's the entity name).
            if re.search(r"\bfund\b", lc) and len(c) > 6 and "name of" not in lc and "portfolio" not in lc and not lc.rstrip().endswith("mutual fund"):
                return clean_scheme(re.sub(r"^[A-Z0-9]{3,8}\s+", "", c))
    return fallback


# Tidy a scheme name for display: fix ALL-CAPS files and make sure the house
# name leads (some AMCs print just "INFRASTRUCTURE FUND" inside the sheet).
_ACR = {"sbi": "SBI", "uti": "UTI", "elss": "ELSS", "mnc": "MNC", "psu": "PSU", "fmcg": "FMCG",
        "etf": "ETF", "us": "US", "it": "IT", "esg": "ESG", "reit": "REIT", "fof": "FOF",
        "nifty": "Nifty", "bse": "BSE", "nse": "NSE", "phd": "PhD"}
_SMALL = {"of", "and", "the", "in", "for", "a", "an"}


def normalize_scheme(name, disp):
    s = clean_scheme(name)
    if s.isupper():                              # ALL-CAPS file → title-case, keep acronyms
        words = []
        for w in s.split():
            lw = w.lower()
            words.append(_ACR.get(lw, lw if lw in _SMALL else w.capitalize()))
        s = " ".join(words)
    first = disp.split()[0]                       # SBI / ICICI / Nippon / Aditya / …
    if first.lower() not in s.lower():
        s = f"{first} {s}"
    return s


def parse_rows(rows, fallback):
    """State machine over a sheet's rows. Handles every SEBI-template layout seen:
      * one scheme per sheet named by a 'SCHEME NAME :' row (SBI/PPFAS),
      * one scheme per sheet named in the title row (Nippon/Kotak),
      * many schemes stacked in one sheet, each with its own marker (UTI),
      * one scheme per file with no marker (ICICI bundle: use the filename).
    Returns [(scheme, [(isin, name, pct)])], scaled and NV-filtered.
    """
    blocks = {}                                      # scheme -> {"h": [...], "p": [...]}
    scheme, hdr = sheet_scheme_name(rows, fallback), None
    for row in rows:
        cells = ["" if c is None else str(c).strip() for c in row]
        low = [c.lower() for c in cells]
        # (1) scheme-name marker → switch current scheme (handles UTI's stacked blocks)
        j = next((k for k, c in enumerate(low) if "scheme name" in c), None)
        if j is not None:
            nm = next((cells[k] for k in range(j + 1, len(cells)) if cells[k]), None)
            if nm:
                scheme, hdr = clean_scheme(nm), None
                continue
        # (2) header row (has an ISIN column and a "% to/of ..." column)
        if any(_is_isin_hdr(c) for c in low) and any(("% to" in c or "% of" in c) for c in low):
            ci = next(k for k, c in enumerate(low) if _is_isin_hdr(c))
            cp = next(k for k, c in enumerate(low) if "% to" in c or "% of" in c)
            cn = next((k for k, c in enumerate(low) if "name of" in c or "instrument" in c or "issuer" in c or "company" in c), 0)
            hdr = (ci, cp, cn)
            continue
        # (3) data row
        if hdr:
            ci, cp, cn = hdr
            if ci < len(cells) and ISIN_RE.match(cells[ci]):
                try:
                    pct = float(cells[cp])
                except (ValueError, IndexError):
                    pct = None
                b = blocks.setdefault(scheme, {"h": [], "p": []})
                if pct is not None:
                    b["p"].append(pct)
                    if cells[ci] in NV_ISIN:
                        b["h"].append((cells[ci], cells[cn] if cn < len(cells) else "", pct))
    out = []
    for sch, b in blocks.items():
        if not b["h"] or SKIP.search(sch):
            continue
        # Scale: "% to NAV" is sometimes a fraction (0.0113 = 1.13%). If the
        # biggest position in the block is <=1.5, the column is fractional → ×100.
        scale = 100.0 if (b["p"] and max(b["p"]) <= 1.5) else 1.0
        # Dedupe ISIN within a scheme (files sometimes repeat it on an exposure sheet).
        seen = {}
        for isin, name, p in b["h"]:
            seen[isin] = max(seen.get(isin, 0), round(p * scale, 2))
        out.append((sch, [(i, "", v) for i, v in seen.items()]))
    return out


def _sheets(data, is_xlsx):
    """Yield each sheet's rows (list of tuples). Opens from bytes so the file
    extension never matters (openpyxl otherwise refuses a non-.xlsx path)."""
    if is_xlsx:
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        for ws in wb.worksheets:
            yield list(ws.iter_rows(values_only=True))
        wb.close()
    else:
        wb = xlrd.open_workbook(file_contents=data)
        for si in range(wb.nsheets):
            sh = wb.sheet_by_index(si)
            yield [sh.row_values(r) for r in range(sh.nrows)]


def parse_workbook(data, is_xlsx, fallback):
    try:
        for rows in _sheets(data, is_xlsx):
            yield from parse_rows(rows, fallback)
    except Exception as e:                       # a single malformed file shouldn't kill the run
        print(f"      parse error ({fallback}): {str(e)[:60]}", file=sys.stderr)


def parse_any(path, fallback_name):
    """Dispatch by content: a bundle-zip of per-scheme files, or a single workbook."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:2] == b"PK":
        # Could be a real bundle (zip of .xlsx/.xls) or a single .xlsx (also a zip
        # internally, but its members are xl/*.xml, not workbook files).
        try:
            zf = zipfile.ZipFile(io.BytesIO(data))
            members = [n for n in zf.namelist() if n.lower().endswith((".xlsx", ".xls"))]
        except zipfile.BadZipFile:
            members = []
        if members:                               # bundle: one file per scheme
            for n in members:
                yield from parse_workbook(zf.read(n), n.lower().endswith(".xlsx"), clean_scheme(os.path.basename(n)))
        else:                                      # single consolidated .xlsx
            yield from parse_workbook(data, True, fallback_name)
    else:                                          # old-style .xls
        yield from parse_workbook(data, False, fallback_name)


def main():
    stocks = {tkr: [] for tkr in NV_ISIN.values()}
    amcs_done, schemes_total, as_of = [], 0, None
    for slug, disp in AMCS:
        url = latest_file_url(slug)
        if not url:
            print(f"  {disp:18} — no file found (skipped)", file=sys.stderr)
            continue
        if as_of is None:
            m = re.search(r"(\d{1,2}(?:st|nd|rd|th)?[ -]?[A-Za-z]{3,9}[ -]?20\d\d|20\d\d[/_ -][A-Za-z]{3,9})", url)
            as_of = m.group(1) if m else None
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as tmp:
            tp = tmp.name
        try:
            if not curl_bin(url, tp):
                print(f"  {disp:18} — download failed (skipped)", file=sys.stderr)
                continue
            n_schemes, n_hits = 0, 0
            for scheme, holdings in parse_any(tp, disp):
                if scheme == disp:      # a sheet we couldn't name (bare AMC) — skip, don't show a blank fund
                    continue
                n_schemes += 1
                nice = normalize_scheme(scheme, disp)
                for isin, _name, pct in holdings:
                    stocks[NV_ISIN[isin]].append({"amc": disp, "scheme": nice, "pct": pct})
                    n_hits += 1
            schemes_total += n_schemes
            if n_hits > 0:
                amcs_done.append(disp)
            print(f"  {disp:18} schemes={n_schemes:3}  NV holdings found={n_hits}", file=sys.stderr)
        finally:
            os.unlink(tp)
        time.sleep(0.5)

    # Dedupe (same fund can appear on more than one sheet), then rank by weight.
    for tkr in stocks:
        best = {}
        for e in stocks[tkr]:
            k = (e["amc"], e["scheme"])
            if e["pct"] > best.get(k, {"pct": -1})["pct"]:
                best[k] = e
        stocks[tkr] = sorted(best.values(), key=lambda x: -x["pct"])
    summary = {tkr: {"count": len(v), "top": v[:12]} for tkr, v in stocks.items()}

    out = {
        "asOf": as_of,
        "amcsCovered": amcs_done,
        "schemesParsed": schemes_total,
        "sources": [
            "AMC monthly portfolio disclosures (SEBI-mandated), discovered via AdvisorKhoj's download centre.",
        ],
        "notes": [
            f"Covers {len(amcs_done)} major fund houses, not all ~44 AMCs — a transparent subset, not exhaustive.",
            "Index funds, ETFs and pure debt/liquid schemes are excluded (they hold mechanically, not by conviction).",
            "% is the stock's weight in that fund, from the fund's latest official monthly disclosure.",
        ],
        "stocks": summary,
    }
    with open("src/data/fundHolders.json", "w") as f:
        json.dump(out, f, indent=1)
    covered = sum(1 for v in summary.values() if v["count"])
    print(f"\nWROTE src/data/fundHolders.json — {len(amcs_done)} AMCs, {schemes_total} schemes, "
          f"{covered}/{len(NV_ISIN)} stocks with fund holders.", file=sys.stderr)


if __name__ == "__main__":
    main()
