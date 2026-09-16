import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request, { module: "workouts" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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

  if (user.role === "NUTRITIONIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const auth = await authorize(request, {
    roles: ["PERSONAL", "ADMIN"],
    module: "workouts",
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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

  // A8: exercicios referenciados precisam ser presets ou do proprio personal (ou ADMIN).
  const exerciseIds = Array.isArray(exercises)
    ? exercises
        .map((ex: { exerciseId?: unknown }) => ex?.exerciseId)
        .filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (exerciseIds.length > 0) {
    const found = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        ...(user.role === "ADMIN"
          ? {}
          : { OR: [{ isPreset: true }, { trainerId: user.userId }] }),
      },
      select: { id: true },
    });
    if (found.length !== exerciseIds.length) {
      return NextResponse.json(
        { error: "Um ou mais exercicios nao existem ou nao pertencem a voce" },
        { status: 400 }
      );
    }
  }

  // A7: substituicao de exercicios + update do treino sao atomicos.
  const workout = await prisma.$transaction(async (tx) => {
    if (exercises?.length) {
      await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
    }

    return tx.workout.update({
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
              alternative: ex.alternative,
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
  });

  return NextResponse.json(workout);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request, {
    roles: ["PERSONAL", "ADMIN"],
    module: "workouts",
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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