import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (payload.role !== "PERSONAL") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        lifetime: true,
        paidUntil: true,
        studentLimit: true,
        monthlyPrice: true,
        referralCode: true,
        referralDiscountMonths: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    const [studentsCount, payments] = await Promise.all([
      prisma.student.count({ where: { personalId: payload.userId } }),
      prisma.payment.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return NextResponse.json({ plan: user, studentsCount, payments });
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}