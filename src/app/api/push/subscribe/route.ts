import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint, p256dh, auth } = body as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
    };
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Subscription invalida" },
        { status: 400 }
      );
    }
    if (!endpoint.startsWith("https://") && !endpoint.startsWith("http://")) {
      return NextResponse.json({ error: "Endpoint invalido" }, { status: 400 });
    }

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (existing && existing.userId !== payload.userId) {
      return NextResponse.json(
        { error: "Endpoint ja registrado para outra conta" },
        { status: 403 }
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { userId: payload.userId, endpoint, p256dh, auth },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
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

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: payload.userId },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}