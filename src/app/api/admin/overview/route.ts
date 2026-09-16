import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [totalPersonals, totalNutritionists, totalStudents, totalClients] =
      await Promise.all([
        prisma.user.count({ where: { role: "PERSONAL" } }),
        prisma.user.count({ where: { role: "NUTRITIONIST" } }),
        prisma.student.count(),
        prisma.student.count({ where: { personalId: { not: null } } }),
      ]);

    const personals = await prisma.user.findMany({
      where: { role: "PERSONAL" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        studentLimit: true,
        monthlyPrice: true,
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        personalId: true,
        personal: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({
      totals: {
        personals: totalPersonals,
        nutritionists: totalNutritionists,
        students: totalStudents,
        studentsWithoutTrainer: totalStudents - totalClients,
      },
      personals,
      students,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}