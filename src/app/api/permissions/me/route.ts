import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { MODULES, buildEffectiveModules } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.user.role === "ADMIN") {
    return NextResponse.json({ modules: MODULES });
  }

  try {
    const [byRole, byUser] = await Promise.all([
      prisma.modulePermission.findMany({
        where: { role: auth.user.role },
        select: { module: true, enabled: true },
      }),
      prisma.userPermission.findMany({
        where: { userId: auth.user.userId },
        select: { module: true, enabled: true },
      }),
    ]);
    const modules = buildEffectiveModules(auth.user.role, byRole, byUser);
    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Permissions me error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}