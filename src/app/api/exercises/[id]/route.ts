import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({ where: { id } });

  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json(exercise);
}

// So o dono (PERSONAL que criou) ou ADMIN podem editar/excluir.
// Exercicios legados (sem trainerId) e presets sao geridos por ADMIN.
async function canManageExercise(
  user: { userId: string; role: string },
  exercise: { trainerId: string | null; isPreset: boolean }
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role !== "PERSONAL") return false;
  return !exercise.isPreset && exercise.trainerId === user.userId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  if (!(await canManageExercise(user, existing))) {
    return NextResponse.json(
      { error: "So e possivel editar exercicios proprios (ou presets via ADMIN)" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, muscleGroup, gifUrl, description } = body;

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(muscleGroup !== undefined && { muscleGroup }),
      ...(gifUrl !== undefined && { gifUrl }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(exercise);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  if (!(await canManageExercise(user, existing))) {
    return NextResponse.json(
      { error: "So e possivel excluir exercicios proprios (ou presets via ADMIN)" },
      { status: 403 }
    );
  }

  await prisma.exercise.delete({ where: { id } });

  return NextResponse.json({ message: "Exercise deleted" });
}