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

  if (user.role === "PERSONAL" && studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
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

  if (user.role !== "PERSONAL") {
    return NextResponse.json(
      { error: "Only trainers can start sessions" },
      { status: 403 }
    );
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
    where: { id: workoutId, trainerId: user.userId },
    include: { exercises: true },
  });

  if (!workout) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (workout.studentId !== studentId) {
    return NextResponse.json(
      { error: "Workout does not belong to this student" },
      { status: 400 }
    );
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

  return NextResponse.json(session, { status: 201 });
}
