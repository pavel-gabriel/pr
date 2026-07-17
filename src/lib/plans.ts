import type { Plan } from "./types";

/**
 * Configurația planurilor. Prețurile afișate sunt orientative — sursa de
 * adevăr pentru încasări sunt Price ID-urile din Stripe (.env).
 */
export const PLANS: Record<
  Plan,
  {
    name: string;
    monthlyPriceRon: number | null;
    videosPerMonth: number;
    description: string;
  }
> = {
  trial: {
    name: "Trial",
    monthlyPriceRon: null,
    videosPerMonth: 3,
    description: "14 zile gratuit — meniu complet și 3 clipuri video AI de probă.",
  },
  start: {
    name: "Start",
    monthlyPriceRon: 149,
    videosPerMonth: 10,
    description:
      "Meniu digital QR nelimitat + 10 clipuri video AI pe lună pentru preparatele tale.",
  },
  pro: {
    name: "Pro",
    monthlyPriceRon: 249,
    videosPerMonth: 30,
    description:
      "30 de clipuri video AI pe lună, export vertical 9:16 pentru social media și branding avansat.",
  },
};

/** Câte generări video mai are un restaurant în luna curentă. */
export function videosRemaining(plan: Plan, usedThisMonth: number): number {
  return Math.max(0, PLANS[plan].videosPerMonth - usedThisMonth);
}
