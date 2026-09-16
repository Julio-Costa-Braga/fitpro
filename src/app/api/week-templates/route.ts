import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const weeks = await prisma.weekTemplate.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : { OR: [{ isPreset: true }, { trainerId: user.userId }] },
      include: {
        days: {
          include: {
            workoutTemplate: {
              select: { id: true, name: true, exercises: { select: { id: true } } },
            },
          },
          orderBy: [{ weekday: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error("Week templates error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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
    const week = await prisma.weekTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level: level ?? "INICIANTE",
        trainerId: user.userId,
        days: { create: cleanDays },
      },
      include: { days: true },
    });
    return NextResponse.json({ week }, { status: 201 });
  } catch (error) {
    console.error("Create week template error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

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