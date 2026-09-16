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

const DAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, { module: "diets", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id } = await params;
    const dietPlan = await getOwnedDiet(user, id);
    if (!dietPlan) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    const meals = await prisma.meal.findMany({
      where: { dietPlanId: id },
      orderBy: { order: "asc" },
      include: { foods: true },
    });

    return NextResponse.json({ meals });
  } catch (error) {
    console.error("List meals error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, { module: "diets", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id } = await params;
    const dietPlan = await getOwnedDiet(user, id);
    if (!dietPlan) {
      return NextResponse.json(
        { error: "Plano alimentar nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { time, name, order, foods = [], dayOfWeek } = body;

    if (!time || !name) {
      return NextResponse.json(
        { error: "Time e name sao obrigatorios" },
        { status: 400 }
      );
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== "" && !DAYS.includes(dayOfWeek)) {
      return NextResponse.json(
        { error: "Dia da semana invalido" },
        { status: 400 }
      );
    }

    const meal = await prisma.meal.create({
      data: {
        time,
        name,
        order: order ?? 0,
        dayOfWeek: dayOfWeek ? dayOfWeek : null,
        dietPlanId: id,
        foods: {
          create: foods.map((food: FoodInput) => ({
            name: food.name,
            quantity: food.quantity ?? "",
            protein: food.protein ?? null,
            carbs: food.carbs ?? null,
            fat: food.fat ?? null,
            calories: food.calories ?? null,
          })),
        },
      },
      include: { foods: true },
    });

    return NextResponse.json({ meal }, { status: 201 });
  } catch (error) {
    console.error("Create meal error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}