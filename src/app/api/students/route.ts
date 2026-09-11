import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const students = await prisma.student.findMany({
      where: { personalId: payload.userId },
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
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nome e obrigatorio" },
        { status: 400 }
      );
    }

    if (email) {
      const existing = await prisma.student.findFirst({
        where: { email, personalId: payload.userId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Estudante com esse email ja cadastrado" },
          { status: 400 }
        );
      }
    }

    const student = await prisma.student.create({
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        personalId: payload.userId,
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