#!/usr/bin/env python3
"""
Peer-positioning ingest for NV Family Office.

For every NV holding, this pulls WHO ELSE owns it, from public data:

  1. Ownership structure  -> Tickertape public API
     (promoter / FII / DII / mutual-fund / retail split, + 6 quarters of history)
  2. Marquee investor overlap -> Trendlyne superstar-shareholder portfolios
     (which well-known investors hold the same names NV holds)

It writes ``src/data/peers.json``, which the dashboard's "Positioning" screen
reads and joins to the live book. Designed to be re-run monthly (e.g. a GitHub
Action) — it only uses public, unauthenticated endpoints via curl, so it works
through the sandbox proxy and in CI.

Notes on data honesty (the whole dashboard runs on real data only):
  * Ownership % are as of the last exchange filing each company disclosed
    (usually the most recent quarter). Tickertape aggregates those filings.
  * The fund-by-fund list ("SBI Bluechip holds 2.1% …") is behind Tickertape's
    login, so v1 shows the *aggregate* mutual-fund % (mfPctT), not a fund list.
  * ENRIN (Siemens Energy India, listed mid-2025) is not yet on Tickertape, so
    it is written with ownership: null and the screen shows it as "awaiting
    first disclosure" rather than inventing numbers.
"""
import json, re, subprocess, sys, time
from html import unescape
from urllib.parse import quote

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# NV's direct-equity book. Keys match the dashboard's `apiTicker ?? ticker`
# so peers.json joins straight onto live holdings. (The ENERGY mutual fund is
# excluded — you can't ask "who else owns this share" of a fund.)
NV = [
    ("ABB", "ABB India"), ("ANTELOPUS", "Antelopus / Selan Energy"), ("CONCOR", "Container Corp"),
    ("EIDPARRY", "EID Parry"), ("ENRIN", "Siemens Energy India"), ("GMDCLTD", "GMDC"),
    ("GPPL", "Gujarat Pipavav"), ("HINDALCO", "Hindalco"), ("IRCTC", "IRCTC"),
    ("JUBLFOOD", "Jubilant FoodWorks"), ("LT", "Larsen & Toubro"), ("NMDC", "NMDC"),
    ("PGEL", "PG Electroplast"), ("TATASTEEL", "Tata Steel"), ("THERMAX", "Thermax"),
    ("DCBBANK", "DCB Bank"),
]

# Tickertape uses its own internal ids ("sid"). Most NV tickers resolve by an
# exact NSE-symbol search; these two need help:
SID_OVERRIDE = {"ANTELOPUS": "SELA"}      # Tickertape still lists it as Selan Exploration Technology
NO_TICKERTAPE = {"ENRIN"}                 # Siemens Energy India: too newly listed to be covered yet

# Marquee investors tracked on Trendlyne (superstar-shareholder id -> name).
# These are individual investors who cross the 1% disclosure threshold; they
# concentrate in small/midcaps, so overlap with a largecap book is naturally
# thin — that thinness is itself an honest finding, not a bug.
INVESTORS = {
    "Ashish Kacholia": 53746, "Radhakishan Damani": 178317, "Sunil Singhania": 182955,
    "Dolly Khanna": 53757, "Ashish Dhawan": 53745, "Akash Bhanshali": 53740,
    "Anil Kumar Goel": 53743, "Vijay Kedia": 53805, "Nemish Shah": 53776,
    "Madhusudan Kela": 584325,
}

TT = "https://api.tickertape.in"


def curl(url, extra=None):
    args = ["curl", "-sSL", "-m", "45", "-A", UA, "-H", "Accept: application/json"] + (extra or []) + [url]
    for _ in range(3):
        r = subprocess.run(args, capture_output=True, text=True)
        if r.returncode == 0 and r.stdout:
            return r.stdout
        time.sleep(2)
    return r.stdout


def tt_stocks(term):
    """Tickertape search -> list of stock hits (dicts). Needs >=3 chars."""
    if len(term) < 3:
        return []  # the search API rejects <3-char queries (e.g. "LT")
    raw = curl(f"{TT}/search?text={quote(term)}")
    try:
        return json.loads(raw).get("data", {}).get("stocks", []) or []
    except Exception:
        return []


def resolve_sid(tkr, name):
    if tkr in SID_OVERRIDE:
        return SID_OVERRIDE[tkr]
    for term in (tkr, name):
        hits = tt_stocks(term)
        exact = next((h for h in hits if (h.get("ticker") or "").upper() == tkr), None)
        if exact:
            return exact["sid"]
    return None


def round1(x):
    return round(x, 1) if isinstance(x, (int, float)) else None


# ---- 1. Ownership structure per NV stock (Tickertape) ---------------------
print("Fetching ownership structure (Tickertape)…", file=sys.stderr)
stocks = {}
sector_of = {}
for tkr, name in NV:
    if tkr in NO_TICKERTAPE:
        stocks[tkr] = {"company": name, "sid": None, "ownership": None, "history": [], "investors": []}
        print(f"  {tkr:10} — not yet covered (recently listed)", file=sys.stderr)
        continue

    hits = tt_stocks(SID_OVERRIDE.get(tkr, tkr)) or tt_stocks(name)
    sid = resolve_sid(tkr, name)
    sector = next((h.get("sector") for h in hits if h.get("sid") == sid), None) or \
        (hits[0].get("sector") if hits else None)
    sector_of[tkr] = sector

    series = []
    if sid:
        try:
            data = json.loads(curl(f"{TT}/stocks/holdings/{sid}")).get("data", [])
        except Exception:
            data = []
        for row in data:
            d = row.get("data", {})
            series.append({
                "q": row.get("date", "")[:10],
                "mf": round1(d.get("mfPctT")),
                "fii": round1(d.get("fiPctT")),
                "dii": round1(d.get("diPctT")),       # DII total (includes MF + insurance)
                "promoter": round1(d.get("pmPctT")),
                "retail": round1(d.get("rhPctT")),
                "others": round1(d.get("othPctT")),
            })

    latest = series[-1] if series else None
    ownership = None
    if latest:
        ownership = {
            "asOf": latest["q"],
            "promoter": latest["promoter"], "fii": latest["fii"], "dii": latest["dii"],
            "mf": latest["mf"], "retail": latest["retail"], "others": latest["others"],
            # crowdedness = total institutional footprint (FII + DII); DII already includes MF.
            "institutional": round1((latest["fii"] or 0) + (latest["dii"] or 0)),
        }
    stocks[tkr] = {"company": name, "sid": sid, "sector": sector,
                   "ownership": ownership, "history": series, "investors": []}
    if ownership:
        print(f"  {tkr:10} inst={ownership['institutional']:>5}  MF={ownership['mf']}  "
              f"FII={ownership['fii']}  DII={ownership['dii']}  prom={ownership['promoter']}", file=sys.stderr)
    else:
        print(f"  {tkr:10} — no ownership data (sid={sid})", file=sys.stderr)
    time.sleep(0.3)

# ---- 2. Marquee investor overlap (Trendlyne) ------------------------------
print("\nFetching marquee investors (Trendlyne)…", file=sys.stderr)
NV_TICKERS = {tkr for tkr, _ in NV}
NV_TICKERS |= {"SELAN"}  # Trendlyne may list Antelopus under its old symbol
ALIAS = {"SELAN": "ANTELOPUS"}                # map any alias back to the NV key
LINK = re.compile(r'href="(https?://trendlyne\.com/equity/share-holding/\d+/([^/]+)/[^"]*)"[^>]*>([^<]*)</a>')

investors_out = []
for inv, sid in INVESTORS.items():
    html = curl(f"https://trendlyne.com/portfolio/superstar-shareholders/{sid}/latest/x-portfolio/")
    held = {}
    for _href, t, txt in LINK.findall(html):
        held.setdefault(t.upper(), unescape(txt.strip()))
    matched = sorted({ALIAS.get(t, t) for t in held if ALIAS.get(t, t) in NV_TICKERS})
    for tkr in matched:
        if tkr in stocks:
            stocks[tkr]["investors"].append(inv)
    investors_out.append({"name": inv, "holdsNV": matched, "portfolioSize": len(held)})
    print(f"  {inv:22} portfolio={len(held):3}  holds NV: {matched}", file=sys.stderr)
    time.sleep(1)

# ---- 3. Assemble peers.json ----------------------------------------------
covered = sum(1 for s in stocks.values() if s["ownership"])
overlap_hits = sum(1 for i in investors_out if i["holdsNV"])
as_of_owner = next((s["ownership"]["asOf"] for s in stocks.values() if s["ownership"]), None)

out = {
    "asOf": {
        "ownership": as_of_owner,
        "generated": None,  # stamped by the caller / CI; scripts here run without a clock
    },
    "coverage": {"stocks": len(NV), "withOwnership": covered},
    "sources": [
        "Tickertape — aggregate shareholding pattern (promoter / FII / DII / mutual fund / retail), from exchange filings",
        "Trendlyne — superstar-shareholder portfolios (marquee individual investors)",
    ],
    "notes": [
        "Ownership % are the latest each company disclosed to the exchanges.",
        "'Mutual fund %' is the aggregate held by all funds; a fund-by-fund list is gated behind login and left for v2.",
        "ENRIN (Siemens Energy India) is too newly listed to be covered yet — shown as awaiting disclosure, not estimated.",
    ],
    "investors": sorted(investors_out, key=lambda x: -len(x["holdsNV"])),
    "stocks": stocks,
}
open("src/data/peers.json", "w").write(json.dumps(out, indent=1))
print(f"\nWROTE src/data/peers.json — {covered}/{len(NV)} stocks with ownership, "
      f"{overlap_hits} investors overlapping NV names.", file=sys.stderr)
