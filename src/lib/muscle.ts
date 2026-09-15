import { useLanguage } from "@/lib/i18n/LanguageProvider";

export const EX_GROUP_KEYS: Record<string, string> = {
  Peito: "exlib.muscle.chest",
  Costas: "exlib.muscle.back",
  Ombros: "exlib.muscle.shoulders",
  Bracos: "exlib.muscle.arms",
  Pernas: "exlib.muscle.legs",
  Abdomen: "exlib.muscle.abs",
  Cardio: "exlib.muscle.cardio",
  Mobilidade: "exlib.muscle.mobility",
  Outros: "exlib.muscle.others",
};

export function useMuscleLabel() {
  const { t } = useLanguage();
  return (group: string) => t(EX_GROUP_KEYS[group] ?? "exlib.muscle.others");
}