import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

/** Generează codul QR (PNG) pentru meniul public al restaurantului. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant inexistent" }, { status: 404 });
  }

  const menuUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/m/${restaurant.slug}`;
  const png = await QRCode.toBuffer(menuUrl, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${restaurant.slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
