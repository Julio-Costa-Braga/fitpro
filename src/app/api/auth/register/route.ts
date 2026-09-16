import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { generateReferralCode } from "@/lib/referral";
import { REFERRAL_DISCOUNT_MONTHS, trialUntil } from "@/lib/billing";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { registerSchema, firstValidationMessage } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
    }
    const { name, password, role, referralCode } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const ipLimit = checkRateLimit(`register:ip:${clientIp(request)}`);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de cadastro. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Cadastro publico cria PERSONAL ou NUTRITIONIST. Alunos sao criados pelos profissionais.
    if (role && role !== "PERSONAL" && role !== "NUTRITIONIST") {
      return NextResponse.json(
        { error: "Somente Personal Trainers e Nutricionistas podem se cadastrar" },
        { status: 400 }
      );
    }
    const registeredRole = role === "NUTRITIONIST" ? "NUTRITIONIST" : "PERSONAL";

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 400 }
      );
    }

    let referredByUserId: string | null = null;
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toLowerCase() },
        select: { id: true },
      });
      if (!referrer) {
        return NextResponse.json(
          { error: "Codigo de indicacao invalido" },
          { status: 400 }
        );
      }
      referredByUserId = referrer.id;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: registeredRole,
        referralCode: generateReferralCode(name),
        referredByUserId,
        referralDiscountMonths: 0,
        paidUntil: trialUntil(),
        studentLimit: 10,
        monthlyPrice: 22,
      },
    });

    // O desconto e de QUEM INDICA (o dono do codigo), nao do indicado.
    if (referredByUserId) {
      await prisma.user.update({
        where: { id: referredByUserId },
        data: { referralDiscountMonths: { increment: REFERRAL_DISCOUNT_MONTHS } },
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
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
        referredByUserId: user.referredByUserId,
      },
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
