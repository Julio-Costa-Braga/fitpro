import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createStudentSchema, firstValidationMessage } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { module: "students" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  try {
    const students = await prisma.student.findMany({
      where:
        payload.role === "ADMIN"
          ? undefined
          : payload.role === "PERSONAL"
            ? { personalId: payload.userId }
            : payload.role === "NUTRITIONIST"
              ? { nutritionistId: payload.userId }
              : { userId: payload.userId },
      include: {
        _count: { select: { workouts: true, dietPlans: true } },
        user: { select: { id: true, isActive: true } },
        restDays: { select: { weekday: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("List students error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request, { module: "students" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  if (payload.role === "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const ipLimit = checkRateLimit(`students:ip:${clientIp(request)}`, 30, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas criacoes de aluno. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  // Limite removido: fatura cobra automaticamente +R$2 por aluno excedente.

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
    }
    const { name, email, phone, password } = parsed.data;

    if (email) {
      const existing = await prisma.student.findFirst({
        where: {
          email,
          OR: [
            ...(payload.role === "PERSONAL" ? [{ personalId: payload.userId }] : []),
            ...(payload.role === "NUTRITIONIST" ? [{ nutritionistId: payload.userId }] : []),
          ],
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Estudante com esse email ja cadastrado" },
          { status: 400 }
        );
      }
    }

    // Personal cria a conta do aluno (com senha temporaria) e o registro de Student vinculado.
    let userId: string | undefined;
    if (email && password) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, studentRecord: { select: { id: true } } },
      });
      if (existingUser) {
        if (existingUser.role !== "STUDENT") {
          return NextResponse.json(
            { error: "Email ja usado por uma conta existente" },
            { status: 400 }
          );
        }
        if (existingUser.studentRecord) {
          return NextResponse.json(
            { error: "Este email ja esta vinculado a outro aluno" },
            { status: 400 }
          );
        }
        // Conta de aluno existente: apenas vincula o registro a ela.
        userId = existingUser.id;
      } else {
        if (typeof password !== "string" || password.length < 8) {
          return NextResponse.json(
            { error: "A senha deve ter no minimo 8 caracteres" },
            { status: 400 }
          );
        }
        const bcrypt = await import("bcryptjs");
        const hashed = await bcrypt.hash(password, 12);
        const created = await prisma.user.create({
          data: {
            name,
            email,
            password: hashed,
            phone: phone || null,
            role: "STUDENT",
            mustChangePassword: true,
            trainerId: payload.userId,
          },
        });
        userId = created.id;
      }
    }

    const student = await prisma.student.create({
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        personalId: payload.role === "PERSONAL" ? payload.userId : null,
        nutritionistId: payload.role === "NUTRITIONIST" ? payload.userId : null,
        ...(userId ? { userId } : {}),
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}