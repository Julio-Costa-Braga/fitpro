import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  if (user.role === "PERSONAL") {
    const student = await prisma.student.findFirst({
      where: { id: studentId, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  } else if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const workouts = await prisma.workout.findMany({
    where: { studentId },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workouts);
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL") {
    return NextResponse.json({ error: "Only trainers can create workouts" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, dayLetter, dayOfWeek, studentId, exercises } = body;

  if (!name || !dayLetter || !studentId) {
    return NextResponse.json(
      { error: "name, dayLetter, and studentId are required" },
      { status: 400 }
    );
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, personalId: user.userId },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const workout = await prisma.workout.create({
    data: {
      name,
      description,
      dayLetter,
      dayOfWeek,
      studentId,
      trainerId: user.userId,
      exercises: exercises?.length
        ? {
            create: exercises.map((ex: any) => ({
              order: ex.order,
              sets: ex.sets ?? 3,
              reps: ex.reps,
              initialLoad: ex.initialLoad,
              restTime: ex.restTime ?? 60,
              notes: ex.notes,
              exerciseId: ex.exerciseId,
            })),
          }
        : undefined,
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(workout, { status: 201 });
}
