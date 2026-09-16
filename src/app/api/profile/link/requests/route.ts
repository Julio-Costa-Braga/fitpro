import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const requests = await prisma.traineeLinkRequest.findMany({
      where:
        user.role === "ADMIN"
          ? { status: "PENDING" }
          : { professionalId: user.userId, status: "PENDING" },
      select: {
        id: true,
        type: true,
        createdAt: true,
        student: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("List link requests error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}