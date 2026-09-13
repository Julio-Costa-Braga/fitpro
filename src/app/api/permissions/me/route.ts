import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { MODULES, MODULE_ROLES, DEFAULT_PERMISSIONS, mergePermissions } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (payload.role === "ADMIN") {
    return NextResponse.json({ modules: MODULES });
  }

  try {
    const stored = await prisma.modulePermission.findMany({
      where: { role: payload.role },
      select: { module: true, enabled: true },
    });
    const perms = mergePermissions(DEFAULT_PERMISSIONS[payload.role] ?? {}, stored);
    const modules = MODULES.filter((m) => perms[m]);
    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Permissions me error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}