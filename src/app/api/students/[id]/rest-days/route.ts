import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { module: "students" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  try {
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(payload, id),
      include: { restDays: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    const restDays = WEEKDAYS.filter((w) =>
      student.restDays.some((r) => r.weekday === w)
    );

    return NextResponse.json({ restDays });
  } catch (error) {
    console.error("List rest days error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  try {
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(payload, id),
    });
    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { weekday, active } = body as { weekday?: string; active?: boolean };
    if (!weekday || !WEEKDAYS.includes(weekday)) {
      return NextResponse.json(
        { error: "Dia da semana invalido" },
        { status: 400 }
      );
    }
    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Informe active (true ou false)" },
        { status: 400 }
      );
    }

    if (active) {
      await prisma.restDay.upsert({
        where: { studentId_weekday: { studentId: id, weekday } },
        create: { studentId: id, weekday },
        update: {},
      });
    } else {
      await prisma.restDay.deleteMany({ where: { studentId: id, weekday } });
    }

    const restDays = await prisma.restDay.findMany({
      where: { studentId: id },
      select: { weekday: true },
    });

    return NextResponse.json({
      restDays: WEEKDAYS.filter((w) => restDays.some((r) => r.weekday === w)),
    });
  } catch (error) {
    console.error("Update rest day error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}