import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { StudentLevel } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.dietTemplate.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : { OR: [{ isPreset: true }, { trainerId: user.userId }] },
      include: {
        meals: { orderBy: { order: "asc" }, include: { foods: true } },
      },
      orderBy: [{ isPreset: "desc" }, { level: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("List diet templates error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only trainers can create templates" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, level } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
    }

    const validLevels = Object.values(StudentLevel);
    const template = await prisma.dietTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level: validLevels.includes(level) ? level : StudentLevel.INICIANTE,
        isPreset: false,
        trainerId: user.role === "PERSONAL" ? user.userId : null,
      },
      include: { meals: { orderBy: { order: "asc" }, include: { foods: true } } },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Create diet template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}