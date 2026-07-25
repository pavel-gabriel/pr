"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  POSTER_FORMATS,
  POSTER_STYLES,
  renderPosterSvg,
  type PosterContent,
  type PosterFormat,
  type PosterStyle,
} from "@/lib/poster";
import { generatePosterCopy, isTextAiConfigured } from "@/lib/ai";

export async function createPoster(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/studio");

  const formatRaw = String(formData.get("format") ?? "a4");
  const styleRaw = String(formData.get("style") ?? "bold");
  const format: PosterFormat = formatRaw in POSTER_FORMATS ? (formatRaw as PosterFormat) : "a4";
  const style: PosterStyle = styleRaw in POSTER_STYLES ? (styleRaw as PosterStyle) : "bold";
  const brandColor = String(formData.get("brand_color") || "#059669");

  const businessName = String(formData.get("business_name") ?? "").trim();
  let headline = String(formData.get("headline") ?? "").trim();
  let subtitle = String(formData.get("subtitle") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  let cta = String(formData.get("cta") ?? "").trim();
  const qrLink = String(formData.get("qr_link") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();

  if (!businessName) {
    redirect(`/app/studio?error=${encodeURIComponent("Numele afacerii este obligatoriu.")}#afise`);
  }

  // Fără headline dar cu descriere → AI-ul scrie textele.
  if (!headline && brief) {
    if (!isTextAiConfigured()) {
      redirect(
        `/app/studio?error=${encodeURIComponent("Scrie măcar titlul afișului — generarea de texte cu AI nu e configurată încă.")}#afise`
      );
    }
    try {
      const copy = await generatePosterCopy(businessName, brief);
      headline = copy.headline;
      subtitle = subtitle || copy.subtitle;
      cta = cta || copy.cta;
    } catch (e) {
      redirect(
        `/app/studio?error=${encodeURIComponent(e instanceof Error ? e.message : "Generarea textelor a eșuat.")}#afise`
      );
    }
  }
  if (!headline) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Completează titlul afișului sau descrie ce promovezi ca să-l scrie AI-ul.")}#afise`
    );
  }

  // Poza (opțional) — inclusă în SVG ca data URI, ca exportul PNG să meargă.
  let photoDataUri: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 3 * 1024 * 1024) {
      redirect(`/app/studio?error=${encodeURIComponent("Poza afișului trebuie să aibă maximum 3MB.")}#afise`);
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const mime = photo.type || "image/jpeg";
    photoDataUri = `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const content: PosterContent = {
    businessName,
    headline,
    subtitle: subtitle || undefined,
    details: details || undefined,
    cta: cta || undefined,
    qrLink: qrLink || undefined,
    photoDataUri,
  };

  const svg = await renderPosterSvg({ format, style, brandColor, content });

  const admin = createAdminClient();
  const posterId = crypto.randomUUID();
  const path = `posters/${user.id}/${posterId}.svg`;
  const { error: uploadError } = await admin.storage
    .from("promo-images")
    .upload(path, svg, { contentType: "image/svg+xml" });
  if (uploadError) {
    redirect(`/app/studio?error=${encodeURIComponent(`Salvarea afișului a eșuat: ${uploadError.message}`)}#afise`);
  }
  const svgUrl = admin.storage.from("promo-images").getPublicUrl(path).data.publicUrl;

  const { error: insertError } = await admin.from("promo_posters").insert({
    id: posterId,
    owner_id: user.id,
    format,
    style,
    brand_color: brandColor,
    // nu persistăm poza (e deja în SVG) — doar textele și opțiunile
    content: { ...content, photoDataUri: undefined, hasPhoto: Boolean(photoDataUri) },
    svg_url: svgUrl,
  });
  if (insertError) {
    redirect(`/app/studio?error=${encodeURIComponent("Salvarea afișului a eșuat.")}#afise`);
  }

  revalidatePath("/app/studio");
  redirect(`/app/studio/afis/${posterId}`);
}
