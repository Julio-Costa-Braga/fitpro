import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

async function resolveDays(
  days: { weekday: string; workoutTemplateId?: string }[] | undefined,
  role: string,
  userId: string
) {
  if (!Array.isArray(days)) return [];
  const seen = new Set<string>();
  const cleaned: { weekday: string; workoutTemplateId: string }[] = [];

  for (const d of days) {
    const weekday = d.weekday?.trim();
    if (!weekday || !WEEKDAYS.includes(weekday)) continue;
    if (seen.has(weekday)) continue;
    const templateId = d.workoutTemplateId?.trim();
    if (!templateId) continue;

    const tpl = await prisma.workoutTemplate.findFirst({
      where:
        role === "ADMIN"
          ? { id: templateId }
          : { id: templateId, OR: [{ isPreset: true }, { trainerId: userId }] },
    });
    if (!tpl) continue;

    seen.add(weekday);
    cleaned.push({ weekday, workoutTemplateId: templateId });
  }

  return cleaned.sort(
    (a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday)
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const week = await prisma.weekTemplate.findFirst({
    where: user.role === "ADMIN" ? { id } : { id, OR: [{ isPreset: true }, { trainerId: user.userId }] },
    include: {
      days: {
        include: {
          workoutTemplate: { select: { id: true, name: true, exercises: { select: { id: true } } } },
        },
        orderBy: [{ weekday: "asc" }],
      },
    },
  });

  if (!week) {
    return NextResponse.json({ error: "Modelo de semana nao encontrado" }, { status: 404 });
  }
  return NextResponse.json({ week });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.weekTemplate.findFirst({
    where: user.role === "ADMIN" ? { id } : { id, trainerId: user.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Modelo de semana nao encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, level, days } = body as {
    name?: string;
    description?: string;
    level?: "INICIANTE" | "MODERADO" | "AVANCADO";
    days?: { weekday: string; workoutTemplateId?: string }[];
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
  }

  const cleanDays = await resolveDays(days, user.role, user.userId);
  if (cleanDays.length === 0) {
    return NextResponse.json(
      { error: "Selecione pelo menos um modelo de treino na semana" },
      { status: 400 }
    );
  }

  try {
    const week = await prisma.$transaction(async (tx) => {
      await tx.weekTemplateDay.deleteMany({ where: { weekTemplateId: id } });
      return tx.weekTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          level: level ?? "INICIANTE",
          days: { create: cleanDays },
        },
        include: { days: true },
      });
    });
    return NextResponse.json({ week });
  } catch (error) {
    console.error("Update week template error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.weekTemplate.findFirst({
    where: user.role === "ADMIN" ? { id } : { id, trainerId: user.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Modelo de semana nao encontrado" }, { status: 404 });
  }

  try {
    await prisma.weekTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete week template error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}