import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { StudentLevel } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.workoutTemplate.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : { OR: [{ isPreset: true }, { trainerId: user.userId }] },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ isPreset: "desc" }, { level: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("List workout templates error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request, {
      roles: ["PERSONAL", "ADMIN"],
      module: "workouts",
    });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const body = await request.json();
    const { name, description, level } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
    }

    const validLevels = Object.values(StudentLevel);
    const template = await prisma.workoutTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level: validLevels.includes(level) ? level : StudentLevel.INICIANTE,
        isPreset: false,
        trainerId: user.role === "PERSONAL" ? user.userId : null,
      },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Create workout template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}