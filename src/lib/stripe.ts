import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_START &&
      process.env.STRIPE_PRICE_PRO
  );
}

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export function priceIdForPlan(plan: "start" | "pro"): string {
  return plan === "start"
    ? process.env.STRIPE_PRICE_START!
    : process.env.STRIPE_PRICE_PRO!;
}
