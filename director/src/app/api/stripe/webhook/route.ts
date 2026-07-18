import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Stripe pentru abonamentele „Promovat” (per listare).
 * Configurare: endpoint separat în dashboard-ul Stripe pentru domeniul
 * directorului, cu evenimentele customer.subscription.*.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Webhook neconfigurat" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Semnătură lipsă" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return NextResponse.json({ error: "Semnătură invalidă" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object;
    const listingId = sub.metadata?.listing_id;
    if (listingId && sub.metadata?.kind === "featured") {
      const active = ["active", "trialing"].includes(sub.status);
      const periodEnd = sub.items.data[0]?.current_period_end;
      const admin = createAdminClient();
      await admin
        .from("listings")
        .update({
          is_featured: active,
          featured_until:
            active && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq("id", listingId);
    }
  }

  return NextResponse.json({ received: true });
}
