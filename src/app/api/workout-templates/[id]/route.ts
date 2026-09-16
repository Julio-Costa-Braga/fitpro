import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { StudentLevel } from "@prisma/client";

function include() {
  return {
    exercises: { include: { exercise: true } as const, orderBy: { order: "asc" as const } },
  };
}

export async function canAccessTemplate(
  user: { userId: string; role: string },
  template: { trainerId: string | null; isPreset: boolean } | null
): Promise<boolean> {
  if (!template) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "STUDENT") return false;
  return template.isPreset || template.trainerId === user.userId;
}

export async function canEditTemplate(
  user: { userId: string; role: string },
  template: { trainerId: string | null; isPreset: boolean } | null
): Promise<boolean> {
  if (!template) return false;
  if (template.isPreset) return user.role === "ADMIN";
  return template.trainerId === user.userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const template = await prisma.workoutTemplate.findUnique({ where: { id }, include: include() });
    if (!(await canAccessTemplate(user, template))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, {
      roles: ["PERSONAL", "ADMIN"],
      module: "workouts",
    });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
    if (!(await canEditTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, level, exercises } = body;

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

    const validLevels = Object.values(StudentLevel);
    // A7: substituicao de exercicios + update do modelo: atomicos.
    const template = await prisma.$transaction(async (tx) => {
      if (exercises !== undefined) {
        await tx.workoutTemplateExercise.deleteMany({ where: { workoutTemplateId: id } });
      }

      return tx.workoutTemplate.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(level !== undefined && { level: validLevels.includes(level) ? level : existing?.level }),
          ...(Array.isArray(exercises) && {
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
        include: include(),
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Update workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, {
      roles: ["PERSONAL", "ADMIN"],
      module: "workouts",
    });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
    if (!(await canEditTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    await prisma.workoutTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}