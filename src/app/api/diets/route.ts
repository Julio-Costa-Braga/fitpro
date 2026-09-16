import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";
import { notifyStudentAssignment } from "@/lib/notify";

interface FoodInput {
  name: string;
  quantity?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
}

interface MealInput {
  time?: string;
  name: string;
  order?: number;
  dayOfWeek?: string;
  foods?: FoodInput[];
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

const DAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request, { module: "diets" });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json(
        { error: "studentId e obrigatorio" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    // O aluno ve SOMENTE as dietas que a nutricionista vinculada passa.
    // Sem nutricionista vinculada, volta a ver todas as dietas do proprio registro.
    const trainerFilter =
      user.role === "STUDENT" && student.nutritionistId
        ? { trainerId: student.nutritionistId }
        : undefined;

    const dietPlans = await prisma.dietPlan.findMany({
      where: { studentId, ...trainerFilter },
      include: {
        meals: {
          orderBy: { order: "asc" },
          include: { foods: true },
        },
        trainer: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ dietPlans });
  } catch (error) {
    console.error("List diet plans error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request, { module: "diets" });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const body = await request.json();
    const {
      name,
      description,
      studentId,
      startDate,
      endDate,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      dailyCalories,
      waterIntake,
      supplementation,
      meals = [],
    } = body;

    if (!name || !studentId) {
      return NextResponse.json(
        { error: "Nome e studentId sao obrigatorios" },
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

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const dietPlan = await prisma.dietPlan.create({
      data: {
        name,
        description: description ?? null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        dailyProtein: dailyProtein ?? null,
        dailyCarbs: dailyCarbs ?? null,
        dailyFat: dailyFat ?? null,
        dailyCalories: dailyCalories ?? null,
        waterIntake: waterIntake ?? null,
        supplementation: supplementation ?? null,
        studentId,
        trainerId: user.userId,
        meals: {
          create: meals.map((meal: MealInput) => ({
            time: meal.time ?? "",
            name: meal.name,
            order: meal.order ?? 0,
            dayOfWeek:
              meal.dayOfWeek && DAYS.includes(meal.dayOfWeek)
                ? meal.dayOfWeek
                : null,
            foods: {
              create: (meal.foods ?? []).map((food: FoodInput) => ({
                name: food.name,
                quantity: food.quantity ?? "",
                protein: food.protein ?? null,
                carbs: food.carbs ?? null,
                fat: food.fat ?? null,
                calories: food.calories ?? null,
              })),
            },
          })),
        },
      },
      include: {
        meals: {
          orderBy: { order: "asc" },
          include: { foods: true },
        },
      },
    });

    await notifyStudentAssignment(
      student.userId,
      "DIET_ASSIGNED",
      student.id,
      `Voce recebeu uma nova dieta: ${name}`,
      "/diets"
    );

    return NextResponse.json({ dietPlan }, { status: 201 });
  } catch (error) {
    console.error("Create diet plan error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}