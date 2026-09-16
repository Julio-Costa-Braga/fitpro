import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
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
    const auth = await authorize(request, { roles: ["STUDENT"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

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
      // Log + notificacao atomica, com date canonico (inicio do dia) para o
      // campo unico deduplicar double-submit e races.
      const { log, didCreate } = await prisma.$transaction(async (tx) => {
        const pre = await tx.mealLog.findFirst({
          where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
          orderBy: { date: "desc" },
        });
        if (pre) return { log: pre, didCreate: false };

        let created: Awaited<ReturnType<typeof tx.mealLog.create>>;
        try {
          created = await tx.mealLog.create({
            data: {
              mealId,
              studentId: dietPlan.student.id,
              dietPlanId: id,
              date: since,
            },
          });
        } catch (err) {
          if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
            const winner = await tx.mealLog.findFirst({
              where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
              orderBy: { date: "asc" },
            });
            if (winner) return { log: winner, didCreate: false };
            throw err;
          }
          throw err;
        }

        if (dietPlan.trainerId) {
          await tx.notification.deleteMany({
            where: {
              userId: dietPlan.trainerId,
              type: "MEAL_EATEN",
              data: { path: ["mealId"], equals: mealId },
            },
          });
          await tx.notification.create({
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
        }

        return { log: created, didCreate: true };
      });

      if (didCreate && dietPlan.trainerId) {
        await sendPushToUser(
          dietPlan.trainerId,
          "FitPro",
          `Refeicao marcada: ${dietPlan.student.name} consumiu ${meal.name}`,
          "/dashboard"
        );
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