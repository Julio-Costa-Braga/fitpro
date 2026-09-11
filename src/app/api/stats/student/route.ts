import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getDayLetter, getDayName } from "@/lib/utils";

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

    const [totalWorkouts, completedSessions, totalSessions, latestProgress, todayWorkout] =
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
        prisma.workout.findFirst({
          where: {
            studentId,
            isActive: true,
            OR: [{ dayLetter: getDayLetter() }, { dayOfWeek: getDayName() }],
          },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" },
            },
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
    });
  } catch (error) {
    console.error("Student stats error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}