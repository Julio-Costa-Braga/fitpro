import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, type ApiUser } from "@/lib/authz";

interface FoodInput {
  name: string;
  quantity?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
}

const DAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

async function getOwnedDiet(user: ApiUser, id: string) {
  return prisma.dietPlan.findFirst({
    where:
      user.role === "ADMIN"
        ? { id }
        : {
            id,
            student: {
              OR:
                user.role === "STUDENT"
                  ? [{ userId: user.userId }]
                  : [{ personalId: user.userId }, { nutritionistId: user.userId }],
            },
          },
    select: { id: true },
  });
}

async function getOwnedMeal(dietPlanId: string, mealId: string) {
  return prisma.meal.findFirst({
    where: { id: mealId, dietPlanId },
    include: { foods: true },
  });
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const auth = await authorize(request, { module: "diets", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id, mealId } = await params;
    const dietPlan = await getOwnedDiet(user, id);
    if (!dietPlan) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    const existing = await getOwnedMeal(id, mealId);
    if (!existing) {
      return NextResponse.json(
        { error: "Refeicao nao encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { time, name, order, foods, dayOfWeek } = body;

    if (time !== undefined && !time) {
      return NextResponse.json(
        { error: "Time invalido" },
        { status: 400 }
      );
    }
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Name invalido" },
        { status: 400 }
      );
    }
    if (
      dayOfWeek !== undefined &&
      dayOfWeek !== null &&
      dayOfWeek !== "" &&
      !DAYS.includes(dayOfWeek)
    ) {
      return NextResponse.json(
        { error: "Dia da semana invalido" },
        { status: 400 }
      );
    }

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        time: time ?? existing.time,
        name: name ?? existing.name,
        order: order ?? existing.order,
        ...(dayOfWeek !== undefined && { dayOfWeek: dayOfWeek || null }),
        foods: foods
          ? {
              deleteMany: {},
              create: foods.map((food: FoodInput) => ({
                name: food.name,
                quantity: food.quantity ?? "",
                protein: food.protein ?? null,
                carbs: food.carbs ?? null,
                fat: food.fat ?? null,
                calories: food.calories ?? null,
              })),
            }
          : undefined,
      },
      include: { foods: true },
    });

    return NextResponse.json({ meal });
  } catch (error) {
    console.error("Update meal error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const auth = await authorize(request, { module: "diets", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id, mealId } = await params;
    const dietPlan = await getOwnedDiet(user, id);
    if (!dietPlan) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    const existing = await getOwnedMeal(id, mealId);
    if (!existing) {
      return NextResponse.json(
        { error: "Refeicao nao encontrada" },
        { status: 404 }
      );
    }

    await prisma.meal.delete({ where: { id: mealId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete meal error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}