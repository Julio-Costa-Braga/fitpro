import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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
    let letterIndex = 0;
    for (const day of orderedDays) {
      const tpl = day.workoutTemplate;
      if (!tpl) continue;

      const assignedLetter = String.fromCharCode(65 + Math.min(letterIndex, 5));
      const workout = await prisma.workout.create({
        data: {
          name: tpl.name,
          description: tpl.description,
          dayLetter: assignedLetter,
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
      letterIndex++;
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