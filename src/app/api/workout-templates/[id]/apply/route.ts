import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only trainers can apply templates" }, { status: 403 });
    }

    const { id } = await params;
    const template = await prisma.workoutTemplate.findUnique({ where: { id }, include: { exercises: true } });
    if (!template) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }
    if (user.role === "PERSONAL" && !template.isPreset && template.trainerId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, dayLetter, dayOfWeek } = body;
    if (!studentId) {
      return NextResponse.json({ error: "studentId e obrigatorio" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: user.role === "ADMIN" ? { id: studentId } : { id: studentId, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Aluno nao encontrado" }, { status: 404 });
    }

    const workout = await prisma.workout.create({
      data: {
        name: template.name,
        description: template.description,
        dayLetter: dayLetter || "A",
        dayOfWeek: dayOfWeek || null,
        studentId: student.id,
        trainerId: user.role === "ADMIN" ? (student.personalId ?? user.userId) : user.userId,
        exercises: {
          create: template.exercises.map((ex) => ({
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            initialLoad: ex.initialLoad,
            restTime: ex.restTime,
            notes: ex.notes,
            exerciseId: ex.exerciseId,
          })),
        },
      },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    console.error("Apply workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}