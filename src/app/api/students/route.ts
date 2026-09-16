import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, canUseModule } from "@/lib/authz";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createStudentSchema, firstValidationMessage } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  // Leitura do proprio registro e self-service (o where abaixo so devolve o proprio aluno).
  // O modulo "students" vale para quem gerencia alunos (PERSONAL/NUTRITIONIST/ADMIN).
  if (payload.role !== "STUDENT" && !(await canUseModule(payload, "students"))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

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

  // Consistencia de plano (igual ao auth/accounts): bloqueia quando a lotacao
  // de alunos do plano e atingida. O checkout de cobranca de excedente continua
  // disponivel na pagina de billing.
  if (payload.role === "PERSONAL" || payload.role === "NUTRITIONIST") {
    const professional = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { studentLimit: true, monthlyPrice: true, lifetime: true },
    });
    if (professional && !professional.lifetime) {
      const count = await prisma.student.count({
        where: {
          OR: [
            { personalId: payload.userId },
            { nutritionistId: payload.userId },
          ],
        },
      });
      if (count >= professional.studentLimit) {
        return NextResponse.json(
          {
            error: `Limite do seu plano atingido: ${professional.studentLimit} aluno(s) por R$ ${professional.monthlyPrice}/mes. Para adicionar mais: +1 aluno R$2, +5 R$6 ou +10 R$14.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
    }
  }

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
    // Conta + registro de aluno: atomicos.
    const student = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (email && password) {
        const existingUser = await tx.user.findUnique({
          where: { email },
          select: { id: true, role: true, studentRecord: { select: { id: true } } },
        });
        if (existingUser) {
          if (existingUser.role !== "STUDENT") {
            throw new Error("EMAIL_USED_BY_OTHER_ROLE");
          }
          if (existingUser.studentRecord) {
            throw new Error("EMAIL_ALREADY_LINKED");
          }
          // Conta de aluno existente: apenas vincula o registro a ela.
          userId = existingUser.id;
        } else {
          if (typeof password !== "string" || password.length < 8) {
            throw new Error("WEAK_PASSWORD");
          }
          const bcrypt = await import("bcryptjs");
          const hashed = await bcrypt.hash(password, 12);
          const created = await tx.user.create({
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

      return tx.student.create({
        data: {
          name,
          email: email ?? null,
          phone: phone ?? null,
          personalId: payload.role === "PERSONAL" ? payload.userId : null,
          nutritionistId: payload.role === "NUTRITIONIST" ? payload.userId : null,
          ...(userId ? { userId } : {}),
        },
      });
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("EMAIL_")) {
      const message =
        error.message === "EMAIL_USED_BY_OTHER_ROLE"
          ? "Email ja usado por uma conta existente"
          : error.message === "EMAIL_ALREADY_LINKED"
            ? "Este email ja esta vinculado a outro aluno"
            : "A senha deve ter no minimo 8 caracteres";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}