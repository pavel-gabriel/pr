/** Ocazii de marketing din România — motorul campaniilor sezoniere. */
export interface Occasion {
  slug: string;
  name: string;
  month: number; // 1-12
  day: number;
  angle: string; // unghiul de promovare sugerat AI-ului
}

const OCCASIONS: Occasion[] = [
  { slug: "sf-ion", name: "Sfântul Ion", month: 1, day: 7, angle: "urări pentru sărbătoriți, ofertă pentru grupuri care sărbătoresc" },
  { slug: "ziua-indragostitilor", name: "Ziua Îndrăgostiților", month: 2, day: 14, angle: "ofertă pentru cupluri, cadouri, seară romantică" },
  { slug: "dragobete", name: "Dragobetele", month: 2, day: 24, angle: "varianta românească a zilei îndrăgostiților — ton local și cald" },
  { slug: "martisor", name: "1 Martie — Mărțișor", month: 3, day: 1, angle: "începutul primăverii, mici atenții pentru cliente" },
  { slug: "ziua-femeii", name: "8 Martie — Ziua Femeii", month: 3, day: 8, angle: "ofertă dedicată doamnelor, cadouri, flori, rezervări pentru mame" },
  { slug: "paste", name: "Paștele", month: 4, day: 20, angle: "meniu/ofertă de sărbători, program special, comenzi din timp" },
  { slug: "1-mai", name: "1 Mai", month: 5, day: 1, angle: "minivacanță, grătar, terasă, relaxare cu prietenii" },
  { slug: "ziua-copilului", name: "1 Iunie — Ziua Copilului", month: 6, day: 1, angle: "ofertă pentru familii cu copii, surprize pentru cei mici" },
  { slug: "inceput-vara", name: "Începutul verii", month: 6, day: 21, angle: "terasă, produse de sezon, răcoritoare, atmosferă de vară" },
  { slug: "sf-maria", name: "Sfânta Maria", month: 8, day: 15, angle: "urări pentru sărbătoriți, weekend prelungit de mini-vacanță" },
  { slug: "inceput-scoala", name: "Începutul școlii", month: 9, day: 8, angle: "reveniri din vacanță, oferte pentru părinți și elevi" },
  { slug: "halloween", name: "Halloween", month: 10, day: 31, angle: "eveniment tematic, decor, distracție" },
  { slug: "sf-nicolae", name: "Moș Nicolae", month: 12, day: 6, angle: "cadouri mici, începutul sezonului de sărbători" },
  { slug: "craciun", name: "Crăciunul", month: 12, day: 25, angle: "meniu/ofertă de sărbători, mese festive, comenzi și rezervări din timp" },
  { slug: "revelion", name: "Revelionul", month: 12, day: 31, angle: "petrecerea de Anul Nou, rezervări, program special" },
];

/** Următoarele `count` ocazii de la data dată, cu numărul de zile rămase. */
export function upcomingOccasions(
  from: Date,
  count = 3
): (Occasion & { date: Date; daysUntil: number })[] {
  const year = from.getFullYear();
  const withDates = OCCASIONS.flatMap((occasion) => {
    const thisYear = new Date(year, occasion.month - 1, occasion.day);
    const nextYear = new Date(year + 1, occasion.month - 1, occasion.day);
    const date = thisYear >= from ? thisYear : nextYear;
    return {
      ...occasion,
      date,
      daysUntil: Math.ceil((date.getTime() - from.getTime()) / 86_400_000),
    };
  });
  return withDates.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, count);
}

export function findOccasion(slug: string): Occasion | undefined {
  return OCCASIONS.find((o) => o.slug === slug);
}
