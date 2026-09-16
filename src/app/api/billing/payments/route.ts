import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  if (status !== "PAID" && status !== "PENDING") {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }
  const payStatus = status;
  const payAmount =
    Number.isInteger(amount) && amount !== undefined && amount > 0
      ? amount!
      : target.monthlyPrice;
  const paidAt = payStatus === "PAID" ? new Date() : null;

  try {
    // Atualizar planos + registrar pagamento de forma atomica.
    const { payment } = await prisma.$transaction(async (tx) => {
      if (payStatus === "PAID") {
        const base =
          target.paidUntil && target.paidUntil.getTime() > Date.now()
            ? target.paidUntil
            : new Date();
        await tx.user.update({
          where: { id: userId },
          data: {
            paidUntil: new Date(base.getTime() + ONE_MONTH),
            isActive: true,
          },
          select: { id: true },
        });
      }

      const created = await tx.payment.create({
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

      return { payment: created };
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