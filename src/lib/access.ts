import type { TokenPayload } from "@/lib/auth";

export type StudentMini = {
  id: string;
  personalId?: string | null;
  nutritionistId?: string | null;
  userId?: string | null;
};

export function isAdminOrTrainerOfStudent(
  user: TokenPayload,
  student: StudentMini | null | undefined
): boolean {
  if (!student) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "PERSONAL") return student.personalId === user.userId;
  if (user.role === "NUTRITIONIST") return student.nutritionistId === user.userId;
  if (user.role === "STUDENT") return student.userId === user.userId;
  return false;
}

export function canReadStudent(user: TokenPayload, student: StudentMini | null | undefined): boolean {
  return isAdminOrTrainerOfStudent(user, student);
}

export function canEditStudent(user: TokenPayload, student: StudentMini | null | undefined): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "PERSONAL") return !!student && student.personalId === user.userId;
  return false;
}