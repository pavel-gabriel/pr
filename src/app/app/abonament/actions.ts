"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe";
import { getOwnedRestaurant } from "../actions";

export async function startCheckout(formData: FormData) {
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  if (!isStripeConfigured()) {
    redirect(`/app/abonament?error=${encodeURIComponent("Plățile nu sunt configurate.")}`);
  }

  const plan = String(formData.get("plan"));
  if (plan !== "start" && plan !== "pro") {
    redirect(`/app/abonament?error=${encodeURIComponent("Plan necunoscut.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const setupPrice = process.env.STRIPE_PRICE_SETUP;
  // Taxa de configurare se percepe o singură dată — nu și la schimbarea planului.
  const { data: priorSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .limit(1)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user?.email,
    line_items: [
      { price: priceIdForPlan(plan), quantity: 1 },
      ...(setupPrice && !priorSub ? [{ price: setupPrice, quantity: 1 }] : []),
    ],
    subscription_data: {
      trial_period_days: restaurant.plan === "trial" ? 14 : undefined,
      metadata: { restaurant_id: restaurant.id, plan },
    },
    metadata: { restaurant_id: restaurant.id, plan },
    success_url: `${siteUrl}/app/abonament?success=1`,
    cancel_url: `${siteUrl}/app/abonament`,
    locale: "ro",
  });

  redirect(session.url!);
}

/** Portalul Stripe — clientul își gestionează singur plata/anularea. */
export async function openBillingPortal() {
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");
  if (!isStripeConfigured()) {
    redirect(`/app/abonament?error=${encodeURIComponent("Plățile nu sunt configurate.")}`);
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("restaurant_id", restaurant.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    redirect(
      `/app/abonament?error=${encodeURIComponent("Nu există încă un abonament plătit pentru acest cont.")}`
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app/abonament`,
  });

  redirect(portal.url);
}
