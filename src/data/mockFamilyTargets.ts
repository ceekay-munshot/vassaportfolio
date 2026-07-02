// Per-entity target asset allocation (the "expected" the family wants to track
// actuals against). Each family member / entity carries its own mandate — e.g.
// "says I don't want gold" → Ankita's gold target is 0. Buckets and order match
// ALLOCATION_BUCKETS in portfolioAnalytics. Values are percentages summing to 100.

import type { AllocationBucket } from "@/lib/portfolioAnalytics";

export type FamilyTarget = {
  member: string;
  mandate: string;
  targets: Record<AllocationBucket, number>;
};

export const FAMILY_TARGETS: FamilyTarget[] = [
  {
    member: "Glow Ventures LLP",
    mandate: "Balanced compounder — the family's core book",
    targets: { Equity: 55, "Fixed Income": 12, Gold: 8, "Real Estate": 10, "Private & Alternatives": 15 },
  },
  {
    member: "Yamini",
    mandate: "Growth tilt — longer horizon, higher private allocation",
    targets: { Equity: 65, "Fixed Income": 5, Gold: 5, "Real Estate": 5, "Private & Alternatives": 20 },
  },
  {
    member: "Ankita",
    mandate: "Growth, no gold — prefers real estate for the real-asset sleeve",
    targets: { Equity: 60, "Fixed Income": 15, Gold: 0, "Real Estate": 12, "Private & Alternatives": 13 },
  },
  {
    member: "Family Foundation",
    mandate: "Capital preservation — income and stability bias",
    targets: { Equity: 40, "Fixed Income": 30, Gold: 10, "Real Estate": 12, "Private & Alternatives": 8 },
  },
];

export const targetFor = (member: string): FamilyTarget | undefined =>
  FAMILY_TARGETS.find((t) => t.member === member);
