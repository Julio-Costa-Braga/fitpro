import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";
import { notifyStudentAssignment } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { module: "workouts" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  let where: { studentId?: string; trainerId?: string } = {};
  if (studentId) {
    const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    where = { studentId };
  } else if (user.role === "PERSONAL") {
    where = { trainerId: user.userId };
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { userId: user.userId },
    });
    if (!student) {
      return NextResponse.json([], { status: 200 });
    }
    where = { studentId: student.id };
  } else if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const workouts = await prisma.workout.findMany({
    where,
    include: {
      student: true,
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const workoutIds = workouts.map((w) => w.id);
  const sessions = workoutIds.length
    ? await prisma.workoutSession.findMany({
        where: { workoutId: { in: workoutIds }, completed: false },
        orderBy: { date: "desc" },
        select: {
          id: true,
          workoutId: true,
          date: true,
          _count: { select: { completedExercises: true } },
          completedExercises: { where: { completed: true }, select: { id: true } },
        },
      })
    : [];
  const sessionsByWorkout = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const list = sessionsByWorkout.get(session.workoutId);
    if (!list) sessionsByWorkout.set(session.workoutId, [session]);
    else if (list.length < 1) list.push(session);
  }
  const result = workouts.map((w) => ({
    ...w,
    sessions: sessionsByWorkout.get(w.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL"], module: "workouts" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  const body = await request.json();
  const { name, description, dayLetter, dayOfWeek, studentId, exercises } = body;

  if (!name || !dayLetter || !studentId) {
    return NextResponse.json(
      { error: "name, dayLetter, and studentId are required" },
      { status: 400 }
    );
  }

  const student = await prisma.student.findFirst({
    where: studentWhereOwned(user, studentId),
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // A8: exercicios referenciados precisam ser presets ou do proprio personal.
  const exerciseIds = Array.isArray(exercises)
    ? exercises
        .map((ex: { exerciseId?: unknown }) => ex?.exerciseId)
        .filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (exerciseIds.length > 0) {
    const found = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        OR: [{ isPreset: true }, { trainerId: user.userId }],
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

  await notifyStudentAssignment(
    student.userId,
    "WORKOUT_ASSIGNED",
    student.id,
    `Voce recebeu um novo treino: ${name}`,
    "/workouts"
  );

  return NextResponse.json(workout, { status: 201 });
}