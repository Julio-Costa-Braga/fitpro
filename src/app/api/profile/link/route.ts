import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (payload.role !== "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: payload.userId },
      select: {
        personal: { select: { id: true, name: true, email: true } },
        nutritionist: { select: { id: true, name: true, email: true } },
      },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ links: student });
  } catch (error) {
    console.error("Profile links error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (payload.role !== "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, type } = body as { code?: string; type?: string };
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Informe o codigo" }, { status: 400 });
    }
    if (type !== "personal" && type !== "nutritionist") {
      return NextResponse.json(
        { error: "Informe o tipo de vinculo (personal ou nutritionist)" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { referralCode: code.trim().toLowerCase() },
      select: { id: true, name: true, role: true },
    });
    if (!target) {
      return NextResponse.json(
        { error: "Codigo de indicacao nao encontrado" },
        { status: 404 }
      );
    }
    if (type === "personal" && target.role !== "PERSONAL") {
      return NextResponse.json(
        { error: "Codigo nao e de um Personal Trainer" },
        { status: 400 }
      );
    }
    if (type === "nutritionist" && target.role !== "NUTRITIONIST") {
      return NextResponse.json(
        { error: "Codigo nao e de um Nutricionista" },
        { status: 400 }
      );
    }
    if (target.id === payload.userId) {
      return NextResponse.json(
        { error: "Nao e possivel se auto-vincular" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { userId: payload.userId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data:
        type === "personal"
          ? { personalId: target.id }
          : { nutritionistId: target.id },
      select: {
        personal: { select: { id: true, name: true, email: true } },
        nutritionist: { select: { id: true, name: true, email: true } },
      },
    });

    // Notifica o profissional que um aluno o vinculou.
    await prisma.notification.create({
      data: {
        type: "STUDENT_LINKED",
        userId: target.id,
        data: {
          studentName: payload.name,
          linkType: type,
        },
      },
    });

    return NextResponse.json({ links: updated });
  } catch (error) {
    console.error("Profile link error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (payload.role !== "STUDENT") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const student = await prisma.student.findUnique({
      where: { userId: payload.userId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data:
        type === "nutritionist" ? { nutritionistId: null } : { personalId: null },
      select: {
        personal: { select: { id: true, name: true, email: true } },
        nutritionist: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ links: updated });
  } catch (error) {
    console.error("Profile unlink error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}