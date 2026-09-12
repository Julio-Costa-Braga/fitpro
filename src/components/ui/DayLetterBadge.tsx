export const dayLetterColor: Record<string, string> = {
  A: "bg-accent/15 text-accent",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-green-500/15 text-green-400",
  D: "bg-yellow-500/15 text-yellow-400",
  E: "bg-red-500/15 text-red-400",
  F: "bg-pink-500/15 text-pink-400",
  G: "bg-violet-500/15 text-violet-400",
};

export function DayLetterBadge({
  letter,
  className = "",
}: {
  letter?: string | null;
  className?: string;
}) {
  const key = (letter || "A").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
        dayLetterColor[key] || dayLetterColor.A
      } ${className}`}
    >
      {letter || "?"}
    </span>
  );
}

export const WEEKDAY_ORDER = [
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
  "Domingo",
];

const DAY_NORMALIZE: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terca",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sabado",
  domingo: "Domingo",
};

export function normalizeDay(d?: string | null): string | null {
  if (!d) return null;
  const key = d
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("feira", "")
    .trim();
  return DAY_NORMALIZE[key] ?? null;
}