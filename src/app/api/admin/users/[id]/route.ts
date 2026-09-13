import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getUserFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json(
      { error: "Voce nao pode alterar a propria conta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Conta nao encontrada" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Nao e possivel alterar contas ADMIN" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    isActive,
    lifetime,
    addMonth,
    role,
    planUpgrade,
  } = body as {
    isActive?: boolean;
    lifetime?: boolean;
    addMonth?: boolean;
    role?: "PERSONAL" | "STUDENT";
    planUpgrade?: { slots: number; price: number };
  };

  const data: {
    isActive?: boolean;
    lifetime?: boolean;
    paidUntil?: Date | null;
    role?: "PERSONAL" | "STUDENT";
  } = {};

  if (typeof isActive === "boolean") data.isActive = isActive;
  if (typeof lifetime === "boolean") {
    data.lifetime = lifetime;
    if (lifetime) data.paidUntil = null;
  }
  if (addMonth) {
    const base = target.paidUntil && target.paidUntil.getTime() > Date.now() ? target.paidUntil : new Date();
    data.paidUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  if (role && ["PERSONAL", "STUDENT"].includes(role)) data.role = role;

  // Upgrade do plano: +slots alunos e +R$price/mes (confirmacao manual de pagamento).
  let planNotes: { studentLimit: number; monthlyPrice: number } | null = null;
  if (
    planUpgrade &&
    (target.role === "PERSONAL" || target.role === "NUTRITIONIST") &&
    Number.isInteger(planUpgrade.slots) &&
    Number.isInteger(planUpgrade.price) &&
    planUpgrade.slots > 0 &&
    planUpgrade.price >= 0
  ) {
    planNotes = {
      studentLimit: target.studentLimit + planUpgrade.slots,
      monthlyPrice: target.monthlyPrice + planUpgrade.price,
    };
  }

  try {
    const updateData = { ...data };
    if (planNotes) {
      Object.assign(updateData, {
        studentLimit: planNotes.studentLimit,
        monthlyPrice: planNotes.monthlyPrice,
      });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lifetime: true,
        paidUntil: true,
        studentLimit: true,
        monthlyPrice: true,
      },
    });

    if (data.role === "PERSONAL") {
      await prisma.user.update({
        where: { id: updated.id },
        data: { referralDiscountMonths: 0 },
      });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getUserFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json(
      { error: "Voce nao pode excluir a propria conta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Conta nao encontrada" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Nao e possivel excluir contas ADMIN" },
      { status: 403 }
    );
  }

  try {
    await prisma.student.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir a conta (pode ter dados vinculados). Prefira desativar a conta." },
      { status: 500 }
    );
  }
}