import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PERSONAL") {
      return NextResponse.json(
        { error: "Only trainers can view stats" },
        { status: 403 }
      );
    }

    const trainerId = user.userId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeWorkouts,
      activeDiets,
      recentSessions,
      studentsWithRecentActivity,
    ] = await Promise.all([
      prisma.student.count({ where: { personalId: trainerId } }),
      prisma.workout.count({ where: { trainerId, isActive: true } }),
      prisma.dietPlan.count({ where: { trainerId, isActive: true } }),
      prisma.workoutSession.findMany({
        where: { student: { personalId: trainerId } },
        include: {
          workout: true,
          student: true,
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.student.findMany({
        where: {
          personalId: trainerId,
          sessions: { some: { date: { gte: sevenDaysAgo } } },
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalStudents,
      activeWorkouts,
      activeDiets,
      recentSessions,
      studentsWithRecentActivity,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}