import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      workout: { include: { exercises: true } },
      student: true,
      completedExercises: {
        include: { exercise: true },
        orderBy: { setNumber: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (user.role === "NUTRITIONIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "PERSONAL" && session.workout.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: session.studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(session);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.workoutSession.findUnique({
    where: { id },
    include: { workout: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (user.role === "NUTRITIONIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "PERSONAL" && existing.workout.trainerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: existing.studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { completed, notes, completedExercises } = body;

  if (completedExercises?.length) {
    await prisma.completedExercise.updateMany({
      where: { sessionId: id },
      data: { completed: false },
    });

    for (const ce of completedExercises) {
      if (ce.id) {
        await prisma.completedExercise.updateMany({
          where: { id: ce.id, sessionId: id },
          data: {
            ...(ce.reps !== undefined && { reps: ce.reps }),
            ...(ce.load !== undefined && { load: ce.load }),
            ...(ce.completed !== undefined && { completed: ce.completed }),
          },
        });
      }
    }
  }

  const allDone = completed !== undefined ? completed : undefined;

  if (allDone === true) {
    const remaining = await prisma.completedExercise.count({
      where: { sessionId: id, completed: false },
    });
    if (remaining > 0) {
      return NextResponse.json(
        { error: `${remaining} exercises are not yet completed` },
        { status: 400 }
      );
    }
  }

  const session = await prisma.workoutSession.update({
    where: { id },
    data: {
      ...(completed !== undefined && { completed }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      completedExercises: {
        include: { exercise: true },
        orderBy: { setNumber: "asc" },
      },
    },
  });

  if (allDone === true) {
    const workout = await prisma.workout.findUnique({
      where: { id: existing.workoutId },
    });
    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
    });
    if (workout && student) {
      await prisma.notification.deleteMany({
        where: {
          userId: workout.trainerId,
          type: "WORKOUT_COMPLETED",
          data: { path: ["sessionId"], equals: id },
        },
      });
      await prisma.notification.create({
        data: {
          type: "WORKOUT_COMPLETED",
          userId: workout.trainerId,
          data: {
            studentName: student.name,
            workoutName: workout.name,
            sessionId: id,
            workoutId: workout.id,
            studentId: student.id,
          },
        },
      });
      await sendPushToUser(
        workout.trainerId,
        "FitPro",
        `Treino concluido: ${student.name} terminou ${workout.name}`,
        "/dashboard"
      );
    }
  }

  return NextResponse.json(session);
}
