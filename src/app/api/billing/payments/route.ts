import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const admin = getUserFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    userId,
    status,
    reference,
    amount,
  } = body as {
    userId?: string;
    status?: "PAID" | "PENDING";
    reference?: string;
    amount?: number;
  };

  if (!userId) {
    return NextResponse.json({ error: "userId e obrigatorio" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "Conta nao encontrada" }, { status: 404 });
  }
  if (target.role !== "PERSONAL") {
    return NextResponse.json(
      { error: "Pagamentos so podem ser registrados para PERSONAL" },
      { status: 400 }
    );
  }

  const payStatus = status === "PENDING" ? "PENDING" : "PAID";
  const payAmount =
    Number.isInteger(amount) && amount !== undefined && amount > 0
      ? amount!
      : target.monthlyPrice;
  const paidAt = payStatus === "PAID" ? new Date() : null;

  try {
    if (payStatus === "PAID") {
      const base =
        target.paidUntil && target.paidUntil.getTime() > Date.now()
          ? target.paidUntil
          : new Date();
      await prisma.user.update({
        where: { id: userId },
        data: {
          paidUntil: new Date(base.getTime() + ONE_MONTH),
          isActive: true,
        },
        select: { id: true },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: payAmount,
        status: payStatus,
        reference: reference?.trim() || undefined,
        paidAt,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        reference: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}