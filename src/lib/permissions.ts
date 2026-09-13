import type { UserRole } from "@/lib/auth";

export const MODULE_ROLES: UserRole[] = ["PERSONAL", "NUTRITIONIST", "STUDENT"];

export const MODULES = [
  "students",
  "workouts",
  "diets",
  "progress",
  "exercises",
  "billing",
] as const;

export type ModuleName = (typeof MODULES)[number];

export const MODULE_LABEL_KEYS: Record<ModuleName, string> = {
  students: "perm.students",
  workouts: "perm.workouts",
  diets: "perm.diets",
  progress: "perm.progress",
  exercises: "perm.exercises",
  billing: "perm.billing",
};

// PERMISSOES PADRAO (usadas como fallback e seed quando nao ha registro no banco)
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  ADMIN: Object.fromEntries(MODULES.map((m) => [m, true])),
  PERSONAL: Object.fromEntries(MODULES.map((m) => [m, true])),
  NUTRITIONIST: {
    students: true,
    workouts: false,
    diets: true,
    progress: true,
    exercises: false,
    billing: true,
  },
  STUDENT: {
    students: false,
    workouts: true,
    diets: true,
    progress: true,
    exercises: false,
    billing: false,
  },
};

export type RolePermissions = Record<string, boolean>;

// Mescla registros do banco com os padroes (banco vence quando existir).
export function mergePermissions(
  defaults: Record<string, boolean>,
  stored: Array<{ module: string; enabled: boolean }>
): Record<string, boolean> {
  const result: Record<string, boolean> = { ...defaults };
  for (const row of stored) {
    if (row.module in result) result[row.module] = row.enabled;
  }
  return result;
}