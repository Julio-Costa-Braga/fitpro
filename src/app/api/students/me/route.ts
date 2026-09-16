import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["STUDENT"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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