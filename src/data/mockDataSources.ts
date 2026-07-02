// The data-adapter layer the family discussed: connect Artyan (their CA's back
// office), Notion notes, a dedicated WhatsApp inbox, custodian/AMC emails, and
// exchange/AMFI feeds — then everything flows into one consolidated view with a
// visible "as-of" freshness and a path back to the source for reconciliation.

export type ConnectorStatus = "Connected" | "Syncing" | "Action needed" | "Available";

export type DataConnector = {
  id: string;
  name: string;
  kind: string;                 // what it brings in
  status: ConnectorStatus;
  lastSync: string;             // human-friendly relative time
  cadence: string;              // how often it refreshes
  records: string;              // what it covers
  note: string;
  accent: "gold" | "sky" | "emerald" | "violet" | "amber" | "slate";
};

export const DATA_CONNECTORS: DataConnector[] = [
  {
    id: "artyan", name: "Artyan", kind: "Consolidated back office (CA)",
    status: "Connected", lastSync: "12 min ago", cadence: "Every 4 hours via API",
    records: "All entities · holdings, NAVs, bank balances",
    note: "Primary book of record. Auto-consolidation pulled into the front office; numbers reconcile to source.",
    accent: "gold",
  },
  {
    id: "custodian", name: "Custodian / Demat Feed", kind: "Direct equity & ETF positions",
    status: "Connected", lastSync: "1 hr ago", cadence: "Daily after market close",
    records: "Direct equity, ETFs, corporate actions",
    note: "Splits, bonuses and dividends flow through automatically into the Corporate Actions tab.",
    accent: "sky",
  },
  {
    id: "amfi", name: "AMFI / RTA Feed", kind: "Mutual fund NAVs & portfolios",
    status: "Connected", lastSync: "Today, 9:30 PM", cadence: "Daily NAV · monthly portfolio",
    records: "5 mutual fund schemes",
    note: "Scheme NAVs daily; disclosed underlying holdings refresh month-end for look-through.",
    accent: "emerald",
  },
  {
    id: "whatsapp", name: "WhatsApp Inbox", kind: "Broker research & manager updates",
    status: "Connected", lastSync: "23 min ago", cadence: "Real-time forwarding",
    records: "Forward to tech@glowventures.in",
    note: "Forward broker notes and manager statements here — PDFs, Excel and images are parsed on arrival.",
    accent: "violet",
  },
  {
    id: "email", name: "AIF / PMS Manager Emails", kind: "Private statements & capital calls",
    status: "Syncing", lastSync: "Syncing now", cadence: "On receipt",
    records: "PMS, AIF, PE fund statements",
    note: "Monthly factsheets, capital-call and distribution notices ingested from manager emails.",
    accent: "amber",
  },
  {
    id: "notion", name: "Notion", kind: "Notes, memos & meeting transcripts",
    status: "Connected", lastSync: "5 min ago", cadence: "Real-time via API",
    records: "IC notes, call transcripts, scribbles",
    note: "Wherever you save notes in Notion, they surface alongside the holdings they reference.",
    accent: "slate",
  },
  {
    id: "exchange", name: "NSE / BSE Filings", kind: "Announcements & regulatory",
    status: "Connected", lastSync: "8 min ago", cadence: "Real-time",
    records: "Filings on your holdings & watchlist",
    note: "Mergers, results, board meetings and rating actions raise alerts against the book.",
    accent: "sky",
  },
  {
    id: "transcripts", name: "Annual Reports & Transcripts", kind: "Filings library",
    status: "Connected", lastSync: "2 hrs ago", cadence: "On publication",
    records: "10y annual reports · quarterly calls",
    note: "Retrieve and query the last 10 annual reports and concall transcripts for any holding or watchlist name.",
    accent: "emerald",
  },
];

// Inbound documents recently ingested across the connectors — shows the
// "reads PDFs, Excel, photos of handwritten notes" capability with freshness
// and a source the user can trace back to.
export type InboundDoc = {
  id: string;
  title: string;
  format: "PDF" | "Excel" | "Image" | "Transcript" | "Note" | "Email";
  source: string;
  received: string;          // relative
  status: "Parsed" | "Parsing" | "Needs review";
  linkedTo: string;          // ticker / fund / entity it was matched to
};

export const INBOUND_DOCS: InboundDoc[] = [
  { id: "d1", title: "Marcellus CCP — May 2026 factsheet", format: "PDF", source: "Manager email", received: "23 min ago", status: "Parsed", linkedTo: "Marcellus CCP" },
  { id: "d2", title: "Kedaara Fund IV — capital call notice", format: "PDF", source: "Manager email", received: "1 hr ago", status: "Parsed", linkedTo: "Kedaara Capital Fund IV" },
  { id: "d3", title: "Jefferies — HDFC Bank initiation", format: "PDF", source: "WhatsApp", received: "2 hrs ago", status: "Parsed", linkedTo: "HDFCBANK" },
  { id: "d4", title: "Custodian holdings statement — Jun", format: "Excel", source: "Custodian feed", received: "Today, 6:10 PM", status: "Parsed", linkedTo: "Direct Equity" },
  { id: "d5", title: "IC meeting — handwritten notes", format: "Image", source: "Upload", received: "Yesterday", status: "Needs review", linkedTo: "Glow Ventures LLP" },
  { id: "d6", title: "Reliance AGM — concall transcript", format: "Transcript", source: "Filings library", received: "Yesterday", status: "Parsed", linkedTo: "RELIANCE" },
  { id: "d7", title: "Avendus ARF — quarterly statement", format: "Email", source: "Manager email", received: "2 days ago", status: "Parsing", linkedTo: "Avendus Absolute Return" },
];
