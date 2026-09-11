import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const result = await prisma.notification.updateMany({
    where: { id, userId: user.userId },
    data: { read: true },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Notificacao nao encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}