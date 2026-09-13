import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const MAX_AVATAR_BYTES = 400_000;

export async function PUT(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { avatarUrl, name } = body as {
    avatarUrl?: string | null;
    name?: string;
  };

  const data: { avatarUrl?: string | null; name?: string } = {};
  let hasUpdate = false;

  if (typeof avatarUrl === "string") {
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarUrl) || avatarUrl.length > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Formato ou tamanho da imagem invalido (max 300KB)." },
        { status: 400 }
      );
    }
    data.avatarUrl = avatarUrl;
    hasUpdate = true;
  } else if (avatarUrl === null) {
    data.avatarUrl = null;
    hasUpdate = true;
  }

  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      return NextResponse.json(
        { error: "Nome deve ter entre 2 e 80 caracteres." },
        { status: 400 }
      );
    }
    data.name = trimmed;
    hasUpdate = true;
  }

  if (!hasUpdate) {
    return NextResponse.json(
      { error: "Nenhum campo para atualizar." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
        referralCode: true,
        referralDiscountMonths: true,
        referredByUserId: true,
        referredByUser: { select: { id: true, name: true } },
        isActive: true,
        lifetime: true,
        paidUntil: true,
        studentLimit: true,
        monthlyPrice: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar o perfil." },
      { status: 500 }
    );
  }
}