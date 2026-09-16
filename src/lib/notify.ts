import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

/**
 * Notifica o aluno quando recebe um treino ou dieta de um profissional.
 * Sem user vinculado (student sem conta), apenas ignora.
 */
export async function notifyStudentAssignment(
  userId: string | null,
  type: "WORKOUT_ASSIGNED" | "DIET_ASSIGNED",
  studentId: string,
  message: string,
  url: string,
  extra?: { workoutName?: string; dietName?: string }
) {
  if (!userId) return;
  await prisma.notification.create({
    data: { type, userId, data: { studentId, ...extra } },
  });
  await sendPushToUser(userId, "FitPro", message, url);
}