import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FTF Consulting — Meniuri digitale cu video AI & Audit SEO",
    template: "%s | FTF Consulting",
  },
  description:
    "Meniuri digitale QR cu clipuri video generate cu AI pentru restaurante, plus audit SEO gratuit pentru afaceri locale.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className="antialiased">{children}</body>
    </html>
  );
}
