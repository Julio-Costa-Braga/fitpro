import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { clearAuthCookie } from "@/lib/auth";

/**
 * Revoga TODAS as sessoes do usuario (bump de tokenVersion).
 * Tokens ja emitidos passam a ser rejeitados pelo freshUser() no proximo request.
 */
export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await prisma.user.update({
      where: { id: auth.user.userId },
      data: { tokenVersion: { increment: 1 } },
    });

    const response = NextResponse.json({ ok: true });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    console.error("Revoke sessions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}