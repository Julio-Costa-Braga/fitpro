import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { studentId } = body as { studentId?: string };

  if (!studentId) {
    return NextResponse.json({ error: "Aluno obrigatorio" }, { status: 400 });
  }

  const week = await prisma.weekTemplate.findFirst({
    where: user.role === "ADMIN" ? { id } : { id, OR: [{ isPreset: true }, { trainerId: user.userId }] },
    include: { days: { include: { workoutTemplate: { include: { exercises: true } } } } },
  });
  if (!week) {
    return NextResponse.json({ error: "Modelo de semana nao encontrado" }, { status: 404 });
  }

  const student = await prisma.student.findFirst({
    where:
      user.role === "ADMIN"
        ? { id: studentId }
        : { id: studentId, personalId: user.userId },
  });
  if (!student) {
    return NextResponse.json(
      { error: "Aluno nao encontrado (so e possivel aplicar nos seus alunos)" },
      { status: 404 }
    );
  }

  const trainerId =
    user.role === "ADMIN" ? (student.personalId ?? user.userId) : user.userId;

  try {
    const orderedDays = [...week.days].sort(
      (a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday)
    );

    const created: { id: string; name: string; dayOfWeek: string | null }[] = [];
    for (const day of orderedDays) {
      const tpl = day.workoutTemplate;
      if (!tpl) continue;

      const workout = await prisma.workout.create({
        data: {
          name: tpl.name,
          description: tpl.description,
          dayLetter: "A",
          dayOfWeek: day.weekday,
          studentId: student.id,
          trainerId,
          exercises: {
            create: tpl.exercises.map((e) => ({
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              initialLoad: e.initialLoad,
              restTime: e.restTime,
              notes: e.notes,
              exerciseId: e.exerciseId,
            })),
          },
        },
        select: { id: true, name: true, dayOfWeek: true },
      });
      created.push(workout);
    }

    return NextResponse.json({
      weekName: week.name,
      created: created.length,
      workouts: created,
    });
  } catch (error) {
    console.error("Apply week template error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}