import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getUserFromRequest } from "@/lib/auth";
import { generateReferralCode } from "@/lib/referral";
import { trialUntil } from "@/lib/billing";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createAccountSchema, firstValidationMessage } from "@/lib/validation";

/**
 * Cria contas de PERSONAL ou STUDENT.
 * - ADMIN: pode criar qualquer papel (e escolher o trainer dos alunos).
 * - PERSONAL: pode criar apenas STUDENT (sempre como seu próprio aluno).
 */
export async function POST(request: NextRequest) {
  const creator = getUserFromRequest(request);
  if (!creator) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (creator.role !== "ADMIN" && creator.role !== "PERSONAL") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const ipLimit = checkRateLimit(`accounts:ip:${clientIp(request)}`, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas criacoes de conta. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  }
  const { name, email, password, phone, role, trainerId } = parsed.data;

  const targetRole = role || undefined;
  if (targetRole && !["PERSONAL", "STUDENT"].includes(targetRole)) {
    return NextResponse.json(
      { error: "Role invalida. Use PERSONAL ou STUDENT" },
      { status: 400 }
    );
  }

  // Personal so cria STUDENT e sempre como aluno dele.
  if (creator.role === "PERSONAL" && targetRole !== "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const finalTrainerId =
    creator.role === "PERSONAL"
      ? creator.userId
      : targetRole === "STUDENT"
        ? trainerId || null
        : null;

  if (targetRole === "STUDENT" && !finalTrainerId) {
    return NextResponse.json(
      { error: "Selecione o personal trainer do aluno" },
      { status: 400 }
    );
  }

  // Limite de alunos do plano do personal.
  if (targetRole === "STUDENT" && creator.role === "PERSONAL") {
    const personal = await prisma.user.findUnique({ where: { id: creator.userId } });
    const studentCount = await prisma.student.count({
      where: { personalId: creator.userId },
    });
    if (personal && studentCount >= personal.studentLimit) {
      return NextResponse.json(
        {
          error: `Limite do seu plano atingido: ${personal.studentLimit} aluno(s) por R$ ${personal.monthlyPrice}/mes. Para adicionar mais: +1 aluno R$2, +5 R$6 ou +10 R$14.`,
          code: "PLAN_LIMIT",
        },
        { status: 403 }
      );
    }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email ja cadastrado" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // ADMIN e não pode criar outro ADMIN.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: (targetRole || "STUDENT") as "PERSONAL" | "STUDENT",
        mustChangePassword: true,
        referralCode: generateReferralCode(name),
        paidUntil: trialUntil(),
      },
    });

    if (user.role === "STUDENT") {
      await prisma.student.create({
        data: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          personalId: finalTrainerId!,
          userId: user.id,
        },
      });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}