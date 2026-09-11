import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter no minimo 6 caracteres" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Troca no primeiro login não exige senha atual; caso contrário valida a atual.
    if (!user.mustChangePassword) {
      const bcrypt = await import("bcryptjs");
      const ok = await bcrypt.compare(currentPassword || "", user.password);
      if (!ok) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
      }
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}