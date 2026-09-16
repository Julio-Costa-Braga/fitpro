import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";

const WINDOW_DAYS = 30;

function windowStart(days: number): Date {
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

    const since = windowStart(WINDOW_DAYS);

    const sessions = await prisma.workoutSession.findMany({
      where: { studentId, date: { gte: since } },
      include: { workout: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    });

    // Preenche TODOS os dias da janela: dias sem sessao marcados como sem registro
    // (nao treinou / nao existe log).
    const byDay = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const k = dayKey(s.date);
      const arr = byDay.get(k) ?? [];
      arr.push(s);
      byDay.set(k, arr);
    }

    const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = dayKey(d);
      const daySessions = (byDay.get(k) ?? []).map((s) => ({
        id: s.id,
        workoutId: s.workoutId,
        workoutName: s.workout.name,
        completed: s.completed,
        skipped: s.skipped,
        skipReason: s.skipReason,
      }));
      return {
        date: d.toISOString(),
        hasRecord: daySessions.length > 0,
        sessions: daySessions,
      };
    });

    return NextResponse.json({ windowDays: WINDOW_DAYS, days });
  } catch (error) {
    console.error("Workout days error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}