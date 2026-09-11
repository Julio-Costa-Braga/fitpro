import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only trainers can update templates" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
    if (!(await canAccessTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, level, exercises } = body;

    if (exercises !== undefined) {
      await prisma.workoutTemplateExercise.deleteMany({ where: { workoutTemplateId: id } });
    }

    const validLevels = Object.values(StudentLevel);
    const template = await prisma.workoutTemplate.update({
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
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only trainers can delete templates" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
    if (!(await canAccessTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    await prisma.workoutTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}