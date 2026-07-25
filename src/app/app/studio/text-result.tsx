import type {
  AdaptedContent,
  CalendarIdea,
  ReelsScript,
  SeasonalCampaign,
} from "@/lib/ai";

const KIND_LABELS: Record<string, string> = {
  postare: "Postare",
  recenzie: "Răspuns la recenzie",
  calendar: "Calendar de conținut",
  adaptare: "Adaptare multi-canal",
  reels: "Script de Reels",
  campanie: "Campanie sezonieră",
};

const box =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm";

function TextBox({ value, rows = 3 }: { value: string; rows?: number }) {
  return <textarea readOnly rows={rows} defaultValue={value} className={box} />;
}

/** Randează rezultatul unui text generat, în funcție de tipul lui. */
export function PromoTextResult({
  kind,
  result,
}: {
  kind: string;
  result: Record<string, unknown>;
}) {
  if (kind === "postare") {
    const variants = (result.variants as string[]) ?? [];
    const hashtags = (result.hashtags as string[]) ?? [];
    return (
      <div className="space-y-2">
        {variants.map((variant, i) => (
          <TextBox key={i} value={variant} />
        ))}
        {hashtags.length > 0 && (
          <p className="text-sm text-emerald-700">{hashtags.map((h) => `#${h}`).join(" ")}</p>
        )}
      </div>
    );
  }

  if (kind === "recenzie") {
    return <TextBox value={String(result.reply ?? "")} />;
  }

  if (kind === "calendar") {
    const ideas = (result.ideas as CalendarIdea[]) ?? [];
    return (
      <div className="overflow-x-auto rounded-lg border border-neutral-100">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-1.5 font-medium">Ziua</th>
              <th className="px-3 py-1.5 font-medium">Canal</th>
              <th className="px-3 py-1.5 font-medium">Tip</th>
              <th className="px-3 py-1.5 font-medium">Ideea</th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-3 py-1.5 font-medium">{idea.day}</td>
                <td className="px-3 py-1.5 text-neutral-600">{idea.channel}</td>
                <td className="px-3 py-1.5 text-neutral-600">{idea.type}</td>
                <td className="px-3 py-1.5">{idea.idea}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "adaptare") {
    const adapted = result as unknown as AdaptedContent;
    const channels: [string, string | undefined][] = [
      ["Facebook", adapted.facebook],
      ["Instagram", adapted.instagram],
      ["TikTok", adapted.tiktok],
      ["Google Business", adapted.google_business],
      ["English 🇬🇧", adapted.english],
    ];
    return (
      <div className="space-y-2">
        {channels
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <p className="mb-0.5 text-xs font-medium text-neutral-500">{label}</p>
              <TextBox value={value!} rows={2} />
            </div>
          ))}
      </div>
    );
  }

  if (kind === "reels") {
    const script = result as unknown as ReelsScript;
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-semibold text-emerald-700">🎣 Hook:</span> {script.hook}
        </p>
        <div className="space-y-1.5">
          {(script.scenes ?? []).map((scene, i) => (
            <div key={i} className="rounded-lg border border-neutral-100 p-2.5">
              <p className="font-medium">
                Cadrul {i + 1}: {scene.shot}
              </p>
              <p className="text-neutral-600">{scene.action}</p>
              <p className="text-xs text-neutral-500">
                Text pe ecran: „{scene.overlay}”
              </p>
            </div>
          ))}
        </div>
        <p>
          <span className="font-medium">🎵 Sunet:</span> {script.audio}
        </p>
        <div>
          <p className="mb-0.5 text-xs font-medium text-neutral-500">Descrierea postării</p>
          <TextBox value={script.caption} rows={2} />
        </div>
      </div>
    );
  }

  if (kind === "campanie") {
    const campaign = result as unknown as SeasonalCampaign;
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-semibold text-emerald-700">💡 Concept:</span>{" "}
          {campaign.concept}
        </p>
        {(campaign.posts ?? []).map((post, i) => (
          <div key={i}>
            <p className="mb-0.5 text-xs font-medium text-neutral-500">
              {i === 0 ? "Postarea de anunț (cu ~o săptămână înainte)" : "Reminder în ziua ocaziei"}
            </p>
            <TextBox value={post} />
          </div>
        ))}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="mb-1 text-xs font-medium text-emerald-700">
            Pentru afiș (copiază-le în secțiunea Afișe ⤴)
          </p>
          <p>
            <span className="font-medium">Titlu:</span> {campaign.posterHeadline}
          </p>
          <p>
            <span className="font-medium">Subtitlu:</span> {campaign.posterSubtitle}
          </p>
          <p>
            <span className="font-medium">CTA:</span> {campaign.posterCta}
          </p>
        </div>
        {(campaign.hashtags ?? []).length > 0 && (
          <p className="text-emerald-700">
            {campaign.hashtags.map((h) => `#${h}`).join(" ")}
          </p>
        )}
      </div>
    );
  }

  return null;
}

export function kindLabel(kind: string, input: Record<string, unknown>): string {
  const base = KIND_LABELS[kind] ?? kind;
  if (kind === "postare" && input.channel) return `${base} · ${String(input.channel)}`;
  if (kind === "calendar" && input.monthName) return `${base} · ${String(input.monthName)}`;
  if (kind === "campanie" && input.occasionName) return `${base} · ${String(input.occasionName)}`;
  return base;
}
