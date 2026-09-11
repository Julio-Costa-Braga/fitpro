import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const [totalPersonals, totalStudents, totalTrainers, totalClients] =
      await Promise.all([
        prisma.user.count({ where: { role: "PERSONAL" } }),
        prisma.student.count(),
        prisma.user.count({ where: { role: "PERSONAL" } }),
        prisma.student.count({ where: { personalId: { not: null } } }),
      ]);

    const personals = await prisma.user.findMany({
      where: { role: "PERSONAL" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
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
    });

    return NextResponse.json({
      totals: {
        personals: totalPersonals,
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