"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAudit } from "@/lib/seo/run-audit";
import { sendAdminEmail } from "@/lib/email";

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".")) return null;
    // Blocăm ținte interne (SSRF) — auditul e doar pentru site-uri publice.
    if (
      /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(
        url.hostname
      )
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function createAudit(formData: FormData) {
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!url) {
    redirect(`/seo?error=${encodeURIComponent("Introdu o adresă web validă (ex: restaurantul-meu.ro).")}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/seo?error=${encodeURIComponent("Introdu o adresă de email validă.")}`);
  }

  const admin = createAdminClient();

  // Rate limiting: un audit per (url, email) pe zi — refolosim raportul recent.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("seo_audits")
    .select("id, status")
    .eq("url", url)
    .eq("email", email)
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && recent.status !== "failed") {
    redirect(`/seo/raport/${recent.id}`);
  }

  const { data: audit, error } = await admin
    .from("seo_audits")
    .insert({ url, email })
    .select("id")
    .single();
  if (error || !audit) {
    redirect(`/seo?error=${encodeURIComponent("Nu am putut porni analiza — încearcă din nou.")}`);
  }

  try {
    await runAudit(audit.id, url);
  } catch {
    // Raportul va afișa starea „failed” cu detalii.
  }

  redirect(`/seo/raport/${audit.id}`);
}

export async function requestOffer(formData: FormData) {
  const auditId = String(formData.get("audit_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email) {
    redirect(
      `/seo/raport/${auditId}?error=${encodeURIComponent("Numele și emailul sunt obligatorii.")}`
    );
  }

  const admin = createAdminClient();
  const { data: audit } = await admin
    .from("seo_audits")
    .select("id, url, score")
    .eq("id", auditId)
    .maybeSingle();

  await admin.from("service_requests").insert({
    audit_id: audit?.id ?? null,
    name,
    email,
    phone: phone || null,
    message: message || null,
  });

  await sendAdminEmail(
    `Lead SEO nou: ${audit?.url ?? "fără audit"}`,
    [
      `Nume: ${name}`,
      `Email: ${email}`,
      `Telefon: ${phone || "—"}`,
      `Site: ${audit?.url ?? "—"} (scor ${audit?.score ?? "—"})`,
      `Mesaj: ${message || "—"}`,
      audit ? `Raport: ${process.env.NEXT_PUBLIC_SITE_URL}/seo/raport/${audit.id}` : "",
    ].join("\n")
  );

  redirect(`/seo/raport/${auditId}?sent=1`);
}
