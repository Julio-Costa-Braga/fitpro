export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDayLetter(): string {
  const days = ["D", "S", "T", "Q", "Q", "S", "S"];
  return days[new Date().getDay()];
}

export function getDayName(): string {
  const days = [
    "domingo",
    "segunda-feira",
    "terca-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sabado",
  ];
  return days[new Date().getDay()];
}

export function calculateMacros(meals: { protein?: number; carbs?: number; fat?: number; calories?: number }[]) {
  return meals.reduce(
    (acc, meal) => ({
      protein: (acc.protein || 0) + (meal.protein || 0),
      carbs: (acc.carbs || 0) + (meal.carbs || 0),
      fat: (acc.fat || 0) + (meal.fat || 0),
      calories: (acc.calories || 0) + (meal.calories || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );
}
