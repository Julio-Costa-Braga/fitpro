import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id, mealId } = await params;
    const body = await request.json().catch(() => ({}));
    const eaten = body.eaten !== false;

    const dietPlan = await prisma.dietPlan.findUnique({
      where: { id },
      include: {
        student: true,
        meals: { where: { id: mealId }, select: { id: true, name: true } },
      },
    });

    if (!dietPlan || !dietPlan.student || dietPlan.student.userId !== user.userId) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    const meal = dietPlan.meals[0];
    if (!meal) {
      return NextResponse.json(
        { error: "Refeicao nao encontrada" },
        { status: 404 }
      );
    }

    const since = startOfToday();

    if (eaten) {
      const existing = await prisma.mealLog.findFirst({
        where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
        orderBy: { date: "desc" },
      });

      let log = existing;
      if (!log) {
        log = await prisma.mealLog.create({
          data: {
            mealId,
            studentId: dietPlan.student.id,
            dietPlanId: id,
          },
        });

        if (dietPlan.trainerId) {
          await prisma.notification.deleteMany({
            where: {
              userId: dietPlan.trainerId,
              type: "MEAL_EATEN",
              data: { path: ["mealId"], equals: mealId },
            },
          });
          await prisma.notification.create({
            data: {
              type: "MEAL_EATEN",
              userId: dietPlan.trainerId,
              data: {
                studentName: dietPlan.student.name,
                mealName: meal.name,
                dietName: dietPlan.name,
                dietId: id,
                mealId,
                studentId: dietPlan.student.id,
              },
            },
          });
          await sendPushToUser(
            dietPlan.trainerId,
            "FitPro",
            `Refeicao marcada: ${dietPlan.student.name} consumiu ${meal.name}`,
            "/dashboard"
          );
        }
      }

      return NextResponse.json({ eaten: true, logId: log.id });
    }

    await prisma.mealLog.deleteMany({
      where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
    });

    return NextResponse.json({ eaten: false, logId: null });
  } catch (error) {
    console.error("Update meal eaten error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}