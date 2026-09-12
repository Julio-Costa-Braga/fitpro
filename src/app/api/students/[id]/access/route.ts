import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (payload.role !== "PERSONAL" && payload.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where:
        payload.role === "ADMIN"
          ? { id }
          : { id, personalId: payload.userId },
      include: { user: true },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }
    if (!student.userId || !student.user) {
      return NextResponse.json(
        { error: "Este aluno nao possui conta de acesso vinculada (cadastre email + senha)" },
        { status: 400 }
      );
    }
    if (student.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Nao e possivel alterar o acesso desta conta" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isActive } = body as { isActive?: boolean };
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Informe isActive (true ou false)" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: student.userId },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Toggle student access error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}