import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

async function getDietById(id: string) {
  return prisma.dietPlan.findUnique({
    where: { id },
    include: {
      student: true,
      meals: {
        orderBy: { order: "asc" },
        include: { foods: true },
      },
    },
  });
}

async function canAccessDiet(
  user: { userId: string; role: string },
  diet: { trainerId: string; student?: { userId?: string | null; personalId?: string | null } | null }
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "PERSONAL") return diet.trainerId === user.userId;
  if (user.role === "STUDENT") {
    if (diet.trainerId === user.userId) return false;
    const student = diet.student;
    return !!student && student.userId === user.userId;
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

const { id } = await params;
    const existing = await getDietById(id);
    if (!existing || !(await canAccessDiet(user, existing))) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dietPlan: existing });
  } catch (error) {
    console.error("Get diet plan error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getDietById(id);
    if (!existing || !(await canAccessDiet(user, existing))) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      startDate,
      endDate,
      isActive,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      dailyCalories,
      waterIntake,
      supplementation,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nome e obrigatorio" },
        { status: 400 }
      );
    }

    const parsedStartDate = parseDate(startDate);
    if (startDate && !parsedStartDate) {
      return NextResponse.json(
        { error: "startDate invalida. Use formato ISO" },
        { status: 400 }
      );
    }
    const parsedEndDate = parseDate(endDate);
    if (endDate && !parsedEndDate) {
      return NextResponse.json(
        { error: "endDate invalida. Use formato ISO" },
        { status: 400 }
      );
    }

    const dietPlan = await prisma.dietPlan.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isActive: isActive ?? existing.isActive,
        dailyProtein: dailyProtein ?? null,
        dailyCarbs: dailyCarbs ?? null,
        dailyFat: dailyFat ?? null,
        dailyCalories: dailyCalories ?? null,
        waterIntake: waterIntake ?? null,
        supplementation: supplementation ?? null,
      },
      include: {
        student: true,
        meals: {
          orderBy: { order: "asc" },
          include: { foods: true },
        },
      },
    });

    return NextResponse.json({ dietPlan });
  } catch (error) {
    console.error("Update diet plan error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getDietById(id);
    if (!existing || !(await canAccessDiet(user, existing))) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.dietPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete diet plan error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}