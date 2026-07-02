// Private-markets commitments and their drawdown / distribution schedule.
// Answers the family's liquidity question directly: "I've committed to certain
// PE funds and there are drawdowns expected — when do I need that liquidity?"
// All amounts in ₹ Crore. All managers are Indian PE/VC/AIF houses.

export type Commitment = {
  id: string;
  fund: string;
  manager: string;
  vintage: number;
  strategy: string;          // Buyout, Growth, Venture, Cat III long/short, etc.
  committed: number;         // ₹ Cr total commitment
  drawn: number;             // ₹ Cr called to date
  distributed: number;       // ₹ Cr returned to date (DPI numerator)
  nav: number;               // ₹ Cr current reported NAV of drawn capital
  familyMember: string;
  status: "Investing" | "Harvesting" | "Fully Drawn";
};

export type CapitalCall = {
  id: string;
  fund: string;
  manager: string;
  dueDate: string;           // ISO
  amount: number;            // ₹ Cr expected call
  purpose: string;
  probability: "Confirmed" | "Expected" | "Indicative";
};

export type Distribution = {
  id: string;
  fund: string;
  date: string;              // ISO
  amount: number;            // ₹ Cr
  kind: "Return of Capital" | "Capital Gain" | "Income";
};

const day = (offset: number): string => {
  const d = new Date("2026-06-30T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const MOCK_COMMITMENTS: Commitment[] = [
  {
    id: "cm1", fund: "Kedaara Capital Fund IV", manager: "Kedaara Capital", vintage: 2024,
    strategy: "Buyout / Control", committed: 250, drawn: 95, distributed: 8, nav: 112,
    familyMember: "Glow Ventures LLP", status: "Investing",
  },
  {
    id: "cm2", fund: "ChrysCapital IX", manager: "ChrysCapital", vintage: 2023,
    strategy: "Growth Equity", committed: 200, drawn: 138, distributed: 22, nav: 167,
    familyMember: "Glow Ventures LLP", status: "Investing",
  },
  {
    id: "cm3", fund: "True North Fund VII", manager: "True North", vintage: 2022,
    strategy: "Mid-market Buyout", committed: 150, drawn: 142, distributed: 64, nav: 121,
    familyMember: "Family Foundation", status: "Harvesting",
  },
  {
    id: "cm4", fund: "Blume Ventures Fund IV", manager: "Blume Ventures", vintage: 2024,
    strategy: "Early-stage Venture", committed: 80, drawn: 31, distributed: 0, nav: 38,
    familyMember: "Yamini", status: "Investing",
  },
  {
    id: "cm5", fund: "Avendus Absolute Return Fund", manager: "Avendus", vintage: 2024,
    strategy: "Cat III AIF — Long/Short", committed: 90, drawn: 82, distributed: 6, nav: 96,
    familyMember: "Family Foundation", status: "Fully Drawn",
  },
  {
    id: "cm6", fund: "Abakkus Emerging Opportunities", manager: "Abakkus", vintage: 2023,
    strategy: "Cat III AIF — Emerging", committed: 100, drawn: 100, distributed: 12, nav: 142,
    familyMember: "Glow Ventures LLP", status: "Fully Drawn",
  },
];

export const MOCK_CAPITAL_CALLS: CapitalCall[] = [
  { id: "cc1", fund: "Kedaara Capital Fund IV", manager: "Kedaara Capital", dueDate: day(21), amount: 18, purpose: "Platform acquisition — healthcare services", probability: "Confirmed" },
  { id: "cc2", fund: "ChrysCapital IX", manager: "ChrysCapital", dueDate: day(38), amount: 12, purpose: "Follow-on — consumer brands portfolio co.", probability: "Expected" },
  { id: "cc3", fund: "Blume Ventures Fund IV", manager: "Blume Ventures", dueDate: day(54), amount: 7, purpose: "Series B reserves deployment", probability: "Expected" },
  { id: "cc4", fund: "Kedaara Capital Fund IV", manager: "Kedaara Capital", dueDate: day(96), amount: 22, purpose: "New control deal — industrials", probability: "Indicative" },
  { id: "cc5", fund: "ChrysCapital IX", manager: "ChrysCapital", dueDate: day(128), amount: 15, purpose: "Bridge for take-private", probability: "Indicative" },
  { id: "cc6", fund: "Blume Ventures Fund IV", manager: "Blume Ventures", dueDate: day(160), amount: 8, purpose: "Reserve top-up", probability: "Indicative" },
];

export const MOCK_DISTRIBUTIONS: Distribution[] = [
  { id: "ds1", fund: "True North Fund VII", date: day(-24), amount: 14, kind: "Capital Gain" },
  { id: "ds2", fund: "ChrysCapital IX", date: day(-51), amount: 9, kind: "Return of Capital" },
  { id: "ds3", fund: "Abakkus Emerging Opportunities", date: day(-78), amount: 12, kind: "Capital Gain" },
  { id: "ds4", fund: "True North Fund VII", date: day(-140), amount: 18, kind: "Capital Gain" },
];
