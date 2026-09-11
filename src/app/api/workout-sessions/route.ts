import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getDayLetter, getDayName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const workoutId = searchParams.get("workoutId");

  if (!studentId && !workoutId) {
    return NextResponse.json(
      { error: "studentId or workoutId is required" },
      { status: 400 }
    );
  }

  const where: any = {};
  if (studentId) where.studentId = studentId;
  if (workoutId) where.workoutId = workoutId;

  if (user.role === "PERSONAL") {
    const student = await prisma.student.findFirst({
      where: { id: studentId ?? undefined, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: studentId ?? undefined, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  } else if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const sessions = await prisma.workoutSession.findMany({
    where,
    include: {
      workout: true,
      completedExercises: {
        include: { exercise: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workoutId, studentId } = body;

  if (!workoutId || !studentId) {
    return NextResponse.json(
      { error: "workoutId and studentId are required" },
      { status: 400 }
    );
  }

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    include: { exercises: true },
  });

  if (!workout) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (user.role === "PERSONAL" && workout.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (workout.studentId !== studentId) {
    return NextResponse.json(
      { error: "Workout does not belong to this student" },
      { status: 400 }
    );
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (user.role === "ADMIN") {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  }

  const session = await prisma.workoutSession.create({
    data: {
      workoutId,
      studentId,
      completedExercises: {
        create: workout.exercises.map((we) => {
          const totalSets = we.sets;
          const sets: any[] = [];
          for (let i = 1; i <= totalSets; i++) {
            sets.push({
              setNumber: i,
              reps: parseInt(we.reps, 10) || 0,
              load: we.initialLoad,
              completed: false,
              exerciseId: we.exerciseId,
            });
          }
          return sets;
        }).flat(),
      },
    },
    include: {
      completedExercises: {
        include: { exercise: true },
      },
    },
  });

  if (user.role === "STUDENT" && workout.trainerId) {
    const ordered = await prisma.workout.findMany({
      where: { studentId, isActive: true },
      orderBy: [{ dayLetter: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, dayLetter: true, dayOfWeek: true },
    });
    const todayLetter = getDayLetter();
    const todayName = getDayName().toLowerCase();
    const baseIdx = ordered.findIndex(
      (w) =>
        w.dayLetter === todayLetter ||
        (w.dayOfWeek && w.dayOfWeek.toLowerCase() === todayName)
    );
    if (baseIdx >= 0 && ordered[baseIdx].id !== workoutId) {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (student) {
        await prisma.notification.create({
          data: {
            type: "WORKOUT_CHANGED",
            userId: workout.trainerId,
            data: {
              studentId,
              studentName: student.name,
              workoutId,
              workoutName: workout.name,
              fromWorkoutName: ordered[baseIdx].name,
            },
          },
        });
      }
    }
  }

  return NextResponse.json(session, { status: 201 });
}
