import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";

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

    const dietPlan = await prisma.dietPlan.findFirst({
      where: { studentId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        meals: { orderBy: { order: "asc" }, include: { foods: { select: { name: true, quantity: true } } } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const logs = dietPlan
      ? await prisma.mealLog.findMany({
          where: { studentId: dietPlan.studentId, date: { gte: monthStart } },
          include: { meal: { select: { id: true, name: true, time: true, order: true } } },
        })
      : [];

    const logsByDay = new Map<string, typeof logs>();
    for (const l of logs) {
      const k = dayKey(l.date);
      const arr = logsByDay.get(k) ?? [];
      arr.push(l);
      logsByDay.set(k, arr);
    }

    const totalDays = today.getDate();
    const days = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
      const k = dayKey(d);
      const dayLogs = logsByDay.get(k) ?? [];

      const meals = (dietPlan?.meals ?? []).map((meal) => {
        const log = dayLogs.find((l) => l.mealId === meal.id);
        return {
          mealId: meal.id,
          name: meal.name,
          time: meal.time,
          foods: meal.foods,
          status: log ? (log.skipped ? "skipped" as const : "eaten" as const) : (null as "eaten" | "skipped" | null),
        };
      });

      const eaten = meals.filter((m) => m.status === "eaten").length;
      const skipped = meals.filter((m) => m.status === "skipped").length;

      return {
        date: d.toISOString(),
        eaten,
        skipped,
        meals,
      };
    });

    return NextResponse.json({
      dietPlanId: dietPlan?.id ?? null,
      dietName: dietPlan?.name ?? null,
      totalMealsPerDay: dietPlan?.meals.length ?? 0,
      days,
    });
  } catch (error) {
    console.error("Diet days error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}