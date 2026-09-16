import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { authorize } from "@/lib/authz";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ipLimit = checkRateLimit(`change-password:ip:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de troca de senha. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "A nova senha deve ter no minimo 8 caracteres" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.userId } });
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

    // Troca de senha revoga as demais sessoes (bump de tokenVersion).
    const newVersion = (user.tokenVersion ?? 0) + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false, tokenVersion: newVersion },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      ver: newVersion,
    });
    const response = NextResponse.json({ ok: true });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}