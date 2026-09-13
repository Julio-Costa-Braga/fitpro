import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { MODULES, buildEffectiveModules } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (payload.role === "ADMIN") {
    return NextResponse.json({ modules: MODULES });
  }

  try {
    const [byRole, byUser] = await Promise.all([
      prisma.modulePermission.findMany({
        where: { role: payload.role },
        select: { module: true, enabled: true },
      }),
      prisma.userPermission.findMany({
        where: { userId: payload.userId },
        select: { module: true, enabled: true },
      }),
    ]);
    const modules = buildEffectiveModules(payload.role, byRole, byUser);
    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Permissions me error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}