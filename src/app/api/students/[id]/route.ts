import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getStudentOwned(id: string, userId: string) {
  return prisma.student.findFirst({
    where: { id, personalId: userId },
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const student = await getStudentOwned(id, payload.userId);

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
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getStudentOwned(id, payload.userId);

    if (!existing) {
      return NextResponse.json(
        { error: "Estudante nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (email && email !== existing.email) {
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

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
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
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getStudentOwned(id, payload.userId);

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