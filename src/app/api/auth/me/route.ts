import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        referralCode: true,
        referredByUserId: true,
        referralDiscountMonths: true,
        referredByUser: { select: { id: true, name: true } },
        isActive: true,
        // Dados de plano/fatura apenas para quem paga (profissionais).
        ...(user.role !== "STUDENT"
          ? { lifetime: true, paidUntil: true, studentLimit: true, monthlyPrice: true }
          : {}),
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}