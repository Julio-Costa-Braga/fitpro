import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import {
  MODULES,
  MODULE_ROLES,
  DEFAULT_PERMISSIONS,
  mergePermissions,
  type RolePermissions,
} from "@/lib/permissions";

function emptyMap(): Record<string, RolePermissions> {
  const map: Record<string, RolePermissions> = {};
  for (const role of MODULE_ROLES) {
    map[role] = {};
    for (const module of MODULES) map[role][module] = false;
  }
  return map;
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rows = await prisma.modulePermission.findMany();
    const perRole = emptyMap();
    for (const role of MODULE_ROLES) {
      const stored = rows.filter((r) => r.role === role);
      const merged = mergePermissions(DEFAULT_PERMISSIONS[role], stored);
      for (const module of MODULES) {
        perRole[role][module] = merged[module];
      }
    }
    return NextResponse.json({ roles: perRole });
  } catch (error) {
    console.error("Admin permissions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { role, module, enabled } = body as {
      role?: string;
      module?: string;
      enabled?: boolean;
    };

    if (!role || !module || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Informe role, module e enabled" },
        { status: 400 }
      );
    }
    if (!MODULE_ROLES.includes(role as (typeof MODULE_ROLES)[number])) {
      return NextResponse.json({ error: "Role invalida" }, { status: 400 });
    }
    if (!MODULES.includes(module as (typeof MODULES)[number])) {
      return NextResponse.json({ error: "Module invalido" }, { status: 400 });
    }

    await prisma.modulePermission.upsert({
      where: { role_module: { role: role as (typeof MODULE_ROLES)[number], module } },
      update: { enabled },
      create: {
        role: role as (typeof MODULE_ROLES)[number],
        module,
        enabled,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin permissions update error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}