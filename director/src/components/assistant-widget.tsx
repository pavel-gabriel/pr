"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

interface AssistantListing {
  name: string;
  slug: string;
  category: string;
  icon: string;
  city: string;
  rating: number | null;
  rating_count: number | null;
  image: string | null;
  is_featured: boolean;
  tags: string[];
}

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  listings?: AssistantListing[];
}

const SUGGESTIONS = [
  "Unde mănânc ramen în Iași?",
  "Restaurant chinezesc cu nota 4.5+",
  "Unde beau cafea de specialitate?",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setInput("");
    setEntries((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);
    try {
      const res = await fetch("/api/asistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setEntries((prev) => [
        ...prev,
        res.ok
          ? { role: "assistant", text: data.reply, listings: data.listings }
          : { role: "assistant", text: data.error ?? "A apărut o eroare — încearcă din nou." },
      ]);
    } catch {
      setEntries((prev) => [
        ...prev,
        { role: "assistant", text: "Nu am putut contacta serverul — încearcă din nou." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
      );
    }
  }

  return (
    <>
      {/* Butonul plutitor */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Deschide asistentul de recomandări"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-2xl text-white shadow-lg transition hover:bg-orange-700"
      >
        {open ? "✕" : "🍜"}
      </button>

      {/* Panoul de chat */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <div className="bg-orange-600 px-4 py-3 text-white">
            <p className="font-semibold">Ce poftești azi?</p>
            <p className="text-xs text-orange-100">
              Spune-mi ce cauți și îți recomand locuri din oraș.
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {entries.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-neutral-500">Încearcă, de exemplu:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-orange-600 hover:text-orange-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {entries.map((entry, i) => (
              <div key={i}>
                <div
                  className={
                    entry.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-sm bg-orange-600 px-3 py-2 text-sm text-white"
                      : "mr-8 rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm"
                  }
                >
                  {entry.text}
                </div>
                {entry.listings && entry.listings.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {entry.listings.map((listing) => (
                      <Link
                        key={listing.slug}
                        href={`/firma/${listing.slug}`}
                        className="flex gap-3 rounded-xl border border-neutral-100 p-2 shadow-sm hover:border-orange-200"
                      >
                        {listing.image ? (
                          <Image
                            src={listing.image}
                            alt={listing.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-100 text-2xl">
                            {listing.icon}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {listing.name}
                            {listing.is_featured && (
                              <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                Promovat
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-neutral-500">
                            {listing.icon} {listing.category} · {listing.city}
                          </p>
                          {listing.rating && (
                            <p className="text-xs">
                              <span className="text-amber-500">★</span>{" "}
                              <span className="font-medium">{listing.rating}</span>
                              {listing.rating_count ? (
                                <span className="text-neutral-400"> ({listing.rating_count})</span>
                              ) : null}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <p className="mr-8 w-fit rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-400">
                Caut recomandări…
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-neutral-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="Ex: pizza bună cu nota 4.5+"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
            <button
              disabled={loading || !input.trim()}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
