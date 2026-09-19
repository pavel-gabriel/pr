"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { SEO_MONITOR_PRICES } from "@/lib/seo/monitor";

/**
 * Pornește plata pentru monitorizarea SEO a unui URL: raport unic la cerere
 * sau abonament lunar. Prețurile merg inline către Stripe (price_data), deci
 * nu e nevoie de produse pre-create în dashboard.
 */
export async function startMonitorCheckout(formData: FormData) {
  const auditId = String(formData.get("audit_id") ?? "");
  const billing =
    String(formData.get("billing")) === "one_time" ? "one_time" : "subscription";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const backTo = `/seo/raport/${auditId}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`${backTo}?error=${encodeURIComponent("Introdu o adresă de email validă pentru rapoarte.")}`);
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    redirect(`${backTo}?error=${encodeURIComponent("Plățile nu sunt configurate încă — scrie-ne și activăm manual monitorizarea.")}`);
  }

  const admin = createAdminClient();
  const { data: audit } = await admin
    .from("seo_audits")
    .select("id, url")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) redirect("/seo");

  // Un singur abonament activ per (url, email).
  if (billing === "subscription") {
    const { data: existing } = await admin
      .from("seo_monitors")
      .select("id")
      .eq("url", audit.url)
      .eq("email", email)
      .eq("billing", "subscription")
      .eq("status", "active")
      .maybeSingle();
    if (existing) {
      redirect(`/seo/monitor/${existing.id}?deja=1`);
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: monitor, error } = await admin
    .from("seo_monitors")
    .insert({
      owner_id: user?.id ?? null,
      audit_id: audit.id,
      url: audit.url,
      email,
      billing,
    })
    .select("id")
    .single();
  if (error || !monitor) {
    redirect(`${backTo}?error=${encodeURIComponent("Nu am putut porni comanda — încearcă din nou.")}`);
  }

  const stripe = getStripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const metadata = { kind: "seo_monitor", monitor_id: monitor.id };

  const session = await stripe.checkout.sessions.create({
    mode: billing === "one_time" ? "payment" : "subscription",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "ron",
          product_data: {
            name:
              billing === "one_time"
                ? `Raport SEO de monitorizare — ${audit.url}`
                : `Monitorizare SEO lunară — ${audit.url}`,
            description:
              billing === "one_time"
                ? "Audit complet nou + comparație cu raportul anterior, la cerere."
                : "Audit complet automat în fiecare lună, cu evoluția scorului pe email.",
          },
          unit_amount:
            (billing === "one_time"
              ? SEO_MONITOR_PRICES.oneTimeRon
              : SEO_MONITOR_PRICES.monthlyRon) * 100,
          ...(billing === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    metadata,
    ...(billing === "subscription" ? { subscription_data: { metadata } } : {}),
    success_url: `${site}/seo/monitor/${monitor.id}?platit=1`,
    cancel_url: `${site}${backTo}`,
    locale: "ro",
  });

  redirect(session.url!);
}
