import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const workout = await prisma.workout.findUnique({
    where: { id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
      student: true,
    },
  });

  if (!workout) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json(workout);
  }

  if (user.role === "PERSONAL" && workout.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: workout.studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(workout);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only trainers can update workouts" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.workout.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (user.role === "PERSONAL" && existing.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, dayLetter, dayOfWeek, isActive, autoAdvance, deadlineDays, exercises } = body;

  if (exercises?.length) {
    await prisma.workoutExercise.deleteMany({ where: { workoutId: id } });
  }

  const workout = await prisma.workout.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(dayLetter !== undefined && { dayLetter }),
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(isActive !== undefined && { isActive }),
      ...(autoAdvance !== undefined && { autoAdvance }),
      ...(deadlineDays !== undefined && { deadlineDays }),
      ...(exercises?.length && {
        exercises: {
          create: exercises.map((ex: any) => ({
            order: ex.order,
            sets: ex.sets ?? 3,
            reps: ex.reps,
            initialLoad: ex.initialLoad,
            restTime: ex.restTime ?? 60,
            notes: ex.notes,
            exerciseId: ex.exerciseId,
          })),
        },
      }),
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(workout);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only trainers can delete workouts" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.workout.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (user.role === "PERSONAL" && existing.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.workout.delete({ where: { id } });

  return NextResponse.json({ message: "Workout deleted" });
}
