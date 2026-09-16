import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

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