import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, canUseModule, findOwnedStudent } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  // Self-service: aluno so pode ler o proprio registro (findOwnedStudent garante isso).
  if (payload.role !== "STUDENT" && !(await canUseModule(payload, "students"))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const student = await findOwnedStudent(payload, id);

    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Get student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { module: "students", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  try {
    const { id } = await params;
    const existing = await findOwnedStudent(payload, id);

    if (!existing) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, phone, reviewFrequencyDays } = body;

    if (email && email !== existing.email && payload.role === "PERSONAL") {
      const duplicate = await prisma.student.findFirst({
        where: { email, personalId: payload.userId, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Estudante com esse email ja cadastrado" },
          { status: 400 }
        );
      }
    }

    const format = reviewFrequencyDays !== undefined ? Number(reviewFrequencyDays) : undefined;
    if (format !== undefined && (!Number.isInteger(format) || format < 7 || format > 365)) {
      return NextResponse.json(
        { error: "Periodo de reavaliacao deve ser um numero inteiro entre 7 e 365 dias" },
        { status: 400 }
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        ...(format !== undefined && { reviewFrequencyDays: format }),
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { module: "students", roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const payload = auth.user;

  try {
    const { id } = await params;
    const existing = await findOwnedStudent(payload, id);

    if (!existing) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ message: "Estudante removido" });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}