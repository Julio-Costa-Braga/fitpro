import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { StudentLevel } from "@prisma/client";

function include() {
  return { meals: { orderBy: { order: "asc" as const }, include: { foods: true } } };
}

export async function canAccessDietTemplate(
  user: { userId: string; role: string },
  template: { trainerId: string | null; isPreset: boolean } | null
): Promise<boolean> {
  if (!template) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "STUDENT") return false;
  return template.isPreset || template.trainerId === user.userId;
}

export async function canEditDietTemplate(
  user: { userId: string; role: string },
  template: { trainerId: string | null; isPreset: boolean } | null
): Promise<boolean> {
  if (!template) return false;
  if (template.isPreset) return user.role === "ADMIN";
  return template.trainerId === user.userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const template = await prisma.dietTemplate.findUnique({ where: { id }, include: include() });
    if (!(await canAccessDietTemplate(user, template))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get diet template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const existing = await prisma.dietTemplate.findUnique({ where: { id } });
    if (!(await canEditDietTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, level, meals, dailyProtein, dailyCarbs, dailyFat, dailyCalories, waterIntake, supplementation } = body;

    const validLevels = Object.values(StudentLevel);
    const template = await prisma.$transaction(async (tx) => {
      if (Array.isArray(meals)) {
        await tx.dietTemplateMeal.deleteMany({ where: { dietTemplateId: id } });
      }
      return tx.dietTemplate.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(level !== undefined && { level: validLevels.includes(level) ? level : existing?.level }),
          ...(dailyProtein !== undefined && { dailyProtein: dailyProtein ?? null }),
          ...(dailyCarbs !== undefined && { dailyCarbs: dailyCarbs ?? null }),
          ...(dailyFat !== undefined && { dailyFat: dailyFat ?? null }),
          ...(dailyCalories !== undefined && { dailyCalories: dailyCalories ?? null }),
          ...(waterIntake !== undefined && { waterIntake: waterIntake ?? null }),
          ...(supplementation !== undefined && { supplementation: supplementation ?? null }),
          ...(Array.isArray(meals) && {
            meals: {
              create: meals.map((meal: any) => ({
                time: meal.time,
                name: meal.name,
                order: meal.order,
                foods: {
                  create: (meal.foods ?? []).map((f: any) => ({
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
          }),
        },
        include: include(),
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Update diet template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(request, { roles: ["PERSONAL", "ADMIN"] });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user;

    const { id } = await params;
    const existing = await prisma.dietTemplate.findUnique({ where: { id } });
    if (!(await canEditDietTemplate(user, existing))) {
      return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
    }

    await prisma.dietTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete diet template error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}