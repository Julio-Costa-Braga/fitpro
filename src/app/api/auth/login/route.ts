import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha sao obrigatorios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { referredByUser: { select: { id: true, name: true } } },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Credenciais invalidas" },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Credenciais invalidas" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Conta desativada. Fale com a administracao." },
        { status: 403 }
      );
    }

    // STUDENT acessa de graca (quem paga e o PERSONAL).
    if (user.role !== "STUDENT") {
      const paid = user.lifetime || (!!user.paidUntil && user.paidUntil.getTime() > Date.now());
      if (!paid) {
        return NextResponse.json(
          { error: "Periodo de teste/pagamento vencido. Renove sua mensalidade para continuar." },
          { status: 403 }
        );
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        referralCode: user.referralCode,
        referralDiscountMonths: user.referralDiscountMonths,
        referredByUser: user.referredByUser
          ? { id: user.referredByUser.id, name: user.referredByUser.name }
          : null,
        isActive: user.isActive,
        lifetime: user.lifetime,
        paidUntil: user.paidUntil,
        studentLimit: user.studentLimit,
        monthlyPrice: user.monthlyPrice,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}