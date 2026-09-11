import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const student = await prisma.student.findFirst({
      where: { userId: user.userId },
      include: { _count: { select: { workouts: true, dietPlans: true } } },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Nenhum registro de aluno vinculado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Get me student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}