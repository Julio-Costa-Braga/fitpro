import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getDayLetter, getDayName } from "@/lib/utils";

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

async function getOrderedWorkouts(studentId: string) {
  return prisma.workout.findMany({
    where: { studentId, isActive: true },
    orderBy: [{ dayLetter: "asc" }, { createdAt: "asc" }],
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

async function resolveTodayWorkout(studentId: string) {
  const ordered = await getOrderedWorkouts(studentId);
  if (ordered.length === 0) return null;

  const todayLetter = getDayLetter();
  const todayName = getDayName().toLowerCase();
  const baseIdx = ordered.findIndex(
    (w) =>
      w.dayLetter === todayLetter ||
      (w.dayOfWeek && w.dayOfWeek.toLowerCase() === todayName)
  );

  const lastCompleted = await prisma.workoutSession.findFirst({
    where: { studentId, completed: true },
    orderBy: { date: "desc" },
    select: { workoutId: true, date: true },
  });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date();

  // base (treino do dia por dia da semana)
  if (baseIdx >= 0) {
    const base = ordered[baseIdx];
    if (base.autoAdvance) {
      const completedToday =
        !!lastCompleted && lastCompleted.workoutId === base.id && isSameDay(lastCompleted.date, now);
      const deadlinePassed =
        base.deadlineDays != null &&
        now.getTime() - new Date(base.createdAt).getTime() >= base.deadlineDays * DAY_MS;
      if ((completedToday || deadlinePassed) && baseIdx < ordered.length - 1) {
        return ordered[baseIdx + 1];
      }
    }
    return base;
  }

  // sem treino agendado para hoje: se houver auto-avancar, segue a sequencia apos o ultimo concluido
  const hasAuto = ordered.some((w) => w.autoAdvance);
  if (hasAuto && lastCompleted) {
    const lastIdx = ordered.findIndex((w) => w.id === lastCompleted.workoutId);
    if (lastIdx >= 0) {
      return ordered[(lastIdx + 1) % ordered.length];
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: studentId }
          : user.role === "PERSONAL"
            ? { id: studentId, personalId: user.userId }
            : { id: studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const [totalWorkouts, completedSessions, totalSessions, latestProgress, todayWorkout, workouts] =
      await Promise.all([
        prisma.workout.count({ where: { studentId } }),
        prisma.workoutSession.count({
          where: { studentId, completed: true },
        }),
        prisma.workoutSession.count({ where: { studentId } }),
        prisma.progressLog.findFirst({
          where: { studentId },
          orderBy: { date: "desc" },
        }),
        resolveTodayWorkout(studentId),
        prisma.workout.findMany({
          where: { studentId, isActive: true },
          orderBy: [{ dayLetter: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            dayLetter: true,
            dayOfWeek: true,
            createdAt: true,
            _count: { select: { exercises: true } },
          },
        }),
      ]);

    const completionRate =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return NextResponse.json({
      totalWorkouts,
      completedSessions,
      totalSessions,
      completionRate,
      latestProgress,
      todayWorkout,
      workouts,
    });
  } catch (error) {
    console.error("Student stats error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}