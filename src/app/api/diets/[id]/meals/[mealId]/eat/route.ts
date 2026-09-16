import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

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
    const skipped = body.skipped === true;
    const eaten = skipped ? false : body.eaten !== false;

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

    // Desmarca a refeicao de hoje (sem estado comido/skip).
    if (!eaten && !skipped) {
      await prisma.mealLog.deleteMany({
        where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
      });
      return NextResponse.json({ eaten: false, skipped: false, logId: null });
    }

    // Marca como COMIDO ou como NAO REALIZADO. Log atomico com date canonico
    // (inicio do dia) para o campo unico deduplicar double-submit e races.
    const { log } = await prisma.$transaction(async (tx) => {
      const pre = await tx.mealLog.findFirst({
        where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
        orderBy: { date: "desc" },
      });
      if (pre) {
        return { log: await tx.mealLog.update({ where: { id: pre.id }, data: { skipped } }) };
      }

      let created: Awaited<ReturnType<typeof tx.mealLog.create>>;
      try {
        created = await tx.mealLog.create({
          data: {
            mealId,
            studentId: dietPlan.student.id,
            dietPlanId: id,
            date: since,
            skipped,
          },
        });
      } catch (err) {
        if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
          const winner = await tx.mealLog.findFirst({
            where: { mealId, studentId: dietPlan.student.id, date: { gte: since } },
            orderBy: { date: "asc" },
          });
          if (winner) {
            return { log: await tx.mealLog.update({ where: { id: winner.id }, data: { skipped } }) };
          }
          throw err;
        }
        throw err;
      }

      return { log: created };
    });

    return NextResponse.json({ eaten: !skipped, skipped, logId: log.id });
  } catch (error) {
    console.error("Update meal eaten error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}