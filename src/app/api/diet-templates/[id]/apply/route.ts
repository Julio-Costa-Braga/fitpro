import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const template = await prisma.dietTemplate.findUnique({
      where: { id },
      include: { meals: { orderBy: { order: "asc" }, include: { foods: true } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }
    if (
      (user.role === "PERSONAL" || user.role === "NUTRITIONIST") &&
      !template.isPreset &&
      template.trainerId !== user.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId } = body;
    if (!studentId) {
      return NextResponse.json({ error: "studentId e obrigatorio" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: studentId }
          : user.role === "NUTRITIONIST"
            ? { id: studentId, nutritionistId: user.userId }
            : { id: studentId, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Aluno nao encontrado" }, { status: 404 });
    }

    const dietPlan = await prisma.dietPlan.create({
      data: {
        name: template.name,
        description: template.description,
        dailyProtein: template.dailyProtein,
        dailyCarbs: template.dailyCarbs,
        dailyFat: template.dailyFat,
        dailyCalories: template.dailyCalories,
        waterIntake: template.waterIntake,
        supplementation: template.supplementation,
        studentId: student.id,
        trainerId: user.role === "ADMIN" ? (student.personalId ?? user.userId) : user.userId,
        meals: {
          create: template.meals.map((meal) => ({
            time: meal.time,
            name: meal.name,
            order: meal.order,
            foods: {
              create: meal.foods.map((f) => ({
                name: f.name,
                quantity: f.quantity,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
                calories: f.calories,
              })),
            },
          })),
        },
      },
      });

    return NextResponse.json({ dietPlan: { id: dietPlan.id } }, { status: 201 });
  } catch (error) {
    console.error("Apply diet template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}