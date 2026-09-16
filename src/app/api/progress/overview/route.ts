import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";

const PERIOD_DAYS = 30;
const DAILY_DAYS = 7;

function startOfWindow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const since = startOfWindow(PERIOD_DAYS);

    // ---- Treino: sessoes logadas nos ultimos 30 dias (concluidas x nao realizadas)
    const [completedSessions, skippedSessions, workoutDaily] = await Promise.all([
      prisma.workoutSession.count({
        where: { studentId, date: { gte: since }, completed: true },
      }),
      prisma.workoutSession.count({
        where: { studentId, date: { gte: since }, skipped: true },
      }),
      prisma.workoutSession.findMany({
        where: { studentId, date: { gte: startOfWindow(DAILY_DAYS) } },
        select: { date: true, completed: true, skipped: true },
      }),
    ]);

    // ---- Dieta: refeicoes logadas nos ultimos 30 dias (comidas x nao realizadas)
    const [eatenMeals, skippedMeals, mealDaily] = await Promise.all([
      prisma.mealLog.count({
        where: { studentId, date: { gte: since }, skipped: false },
      }),
      prisma.mealLog.count({
        where: { studentId, date: { gte: since }, skipped: true },
      }),
      prisma.mealLog.findMany({
        where: { studentId, date: { gte: startOfWindow(DAILY_DAYS) } },
        select: { date: true, skipped: true },
      }),
    ]);

    const workoutTotal = completedSessions + skippedSessions;
    const dietTotal = eatenMeals + skippedMeals;

    // Agrupa por dia (ultimos DAILY_DAYS dias).
    const workoutByDay = new Map<string, { completed: number; skipped: number }>();
    for (const s of workoutDaily) {
      const k = dayKey(s.date);
      const cur = workoutByDay.get(k) ?? { completed: 0, skipped: 0 };
      if (s.completed) cur.completed += 1;
      else if (s.skipped) cur.skipped += 1;
      workoutByDay.set(k, cur);
    }

    const dietByDay = new Map<string, { eaten: number; skipped: number }>();
    for (const m of mealDaily) {
      const k = dayKey(m.date);
      const cur = dietByDay.get(k) ?? { eaten: 0, skipped: 0 };
      if (m.skipped) cur.skipped += 1;
      else cur.eaten += 1;
      dietByDay.set(k, cur);
    }

    const start = startOfWindow(DAILY_DAYS);
    const workoutDailyArr = Array.from({ length: DAILY_DAYS }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d.toISOString(), ...(workoutByDay.get(dayKey(d)) ?? { completed: 0, skipped: 0 }) };
    });

    const dietDailyArr = Array.from({ length: DAILY_DAYS }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d.toISOString(), ...(dietByDay.get(dayKey(d)) ?? { eaten: 0, skipped: 0 }) };
    });

    return NextResponse.json({
      periodDays: PERIOD_DAYS,
      workouts: {
        completed: completedSessions,
        skipped: skippedSessions,
        total: workoutTotal,
        completionRate: workoutTotal > 0 ? Math.round((completedSessions / workoutTotal) * 100) : 0,
        daily: workoutDailyArr,
      },
      diet: {
        eaten: eatenMeals,
        skipped: skippedMeals,
        total: dietTotal,
        adherenceRate: dietTotal > 0 ? Math.round((eatenMeals / dietTotal) * 100) : 0,
        daily: dietDailyArr,
      },
    });
  } catch (error) {
    console.error("Progress overview error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}