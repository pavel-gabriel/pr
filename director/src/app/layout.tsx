import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/types";
import { AssistantWidget } from "@/components/assistant-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — afacerile bune din orașul tău`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Descoperă restaurante, cafenele și servicii locale — cu poze, video și rating. Promovează-ți gratuit afacerea în orașul tău.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-neutral-50 antialiased">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              {SITE_NAME.split(" ")[0]}{" "}
              <span className="text-orange-600">
                {SITE_NAME.split(" ").slice(1).join(" ")}
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/cont" className="hover:text-orange-600">
                Contul meu
              </Link>
              <Link
                href="/cont/adauga"
                className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
              >
                Adaugă-ți afacerea
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <AssistantWidget />
        <footer className="mt-16 border-t border-neutral-200 bg-white py-8 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} {SITE_NAME} · un produs{" "}
          <a href="https://ftfconsulting.ro" className="underline hover:text-orange-600">
            FTF Consulting
          </a>
        </footer>
      </body>
    </html>
  );
}
