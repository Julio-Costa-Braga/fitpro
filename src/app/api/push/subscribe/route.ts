import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Servicos de push confiaveis. Apenas endpoints https desses hosts sao aceitos
// (previne SSRF para hosts arbitrarios).
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "fcmregistrations.googleapis.com",
  "android.googleapis.com",
  "web.push.apple.com",
  "api.push.apple.com",
  "push.services.mozilla.com",
  "updates.push.services.mozilla.com",
  "push.allizom.org",
  "notify.windows.com",
  "windows.com",
];

function isSafePushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ipLimit = checkRateLimit(`push:ip:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas subscriptions. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { endpoint, p256dh, auth: authKey } = body as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
    };
    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "Subscription invalida" },
        { status: 400 }
      );
    }
    // SSRF: somente https em servicos de push conhecidos.
    if (!isSafePushEndpoint(endpoint)) {
      return NextResponse.json({ error: "Endpoint invalido" }, { status: 400 });
    }
    // Tamanhos esperados: p256dh = 65 bytes (88 em base64url), auth = 16 bytes.
    if (p256dh.length < 80 || p256dh.length > 100 || authKey.length < 20 || authKey.length > 40) {
      return NextResponse.json({ error: "Chaves de subscription invalidas" }, { status: 400 });
    }

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (existing && existing.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: "Endpoint ja registrado para outra conta" },
        { status: 403 }
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth: authKey },
      create: { userId: auth.user.userId, endpoint, p256dh, auth: authKey },
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
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: auth.user.userId },
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