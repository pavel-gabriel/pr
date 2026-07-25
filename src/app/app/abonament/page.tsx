import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { getOwnedRestaurant } from "../actions";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata = { title: "Abonament" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentPlan = PLANS[restaurant.plan];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Abonamentul tău</h1>

      {success && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Plata a fost inițiată — planul se activează automat la confirmarea
          Stripe (de obicei în câteva secunde).
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-500">Plan curent</p>
        <p className="text-2xl font-bold">{currentPlan.name}</p>
        <p className="mt-1 text-sm text-neutral-600">{currentPlan.description}</p>
        {subscription?.current_period_end && (
          <p className="mt-2 text-xs text-neutral-400">
            Perioada curentă expiră la{" "}
            {new Date(subscription.current_period_end).toLocaleDateString("ro-RO")}{" "}
            · status: {subscription.status}
          </p>
        )}
        {subscription?.stripe_customer_id && (
          <form action={openBillingPortal} className="mt-3">
            <button className="text-sm text-emerald-700 underline hover:text-emerald-600">
              Gestionează plata / anulează abonamentul →
            </button>
          </form>
        )}
      </div>

      {!isStripeConfigured() ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Plățile online nu sunt active încă pe acest mediu. Pentru activarea
          unui plan, scrie-ne la{" "}
          <a href="mailto:contact@ftfconsulting.ro" className="underline">
            contact@ftfconsulting.ro
          </a>{" "}
          și îți trimitem factura.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["start", "pro"] as const).map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrent = restaurant.plan === planKey;
            return (
              <div key={planKey} className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="font-bold">{plan.name}</h2>
                <p className="mt-1 text-2xl font-bold">
                  {plan.monthlyPriceRon}
                  <span className="text-sm font-normal text-neutral-500"> lei/lună</span>
                </p>
                <p className="mt-2 text-sm text-neutral-600">{plan.description}</p>
                <form action={startCheckout} className="mt-4">
                  <input type="hidden" name="plan" value={planKey} />
                  <button
                    disabled={isCurrent}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-neutral-200 disabled:text-neutral-500"
                  >
                    {isCurrent ? "Planul curent" : `Treci la ${plan.name}`}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
