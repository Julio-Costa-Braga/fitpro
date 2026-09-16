import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import {
  MODULES,
  DEFAULT_PERMISSIONS,
  mergePermissions,
} from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    const roleRows = await prisma.modulePermission.findMany({
      where: { role: user.role },
      select: { module: true, enabled: true },
    });
    const userRows = await prisma.userPermission.findMany({
      where: { userId: user.id },
      select: { module: true, enabled: true },
    });

    const rolePerms = mergePermissions(
      DEFAULT_PERMISSIONS[user.role] ?? DEFAULT_PERMISSIONS.STUDENT,
      roleRows
    );
    const overrides: Record<string, boolean> = {};
    for (const row of userRows) overrides[row.module] = row.enabled;
    const effective = mergePermissions(rolePerms, userRows);

    return NextResponse.json({ role: user.role, rolePerms, overrides, effective });
  } catch (error) {
    console.error("Admin user permissions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { module, value } = body as {
      module?: string;
      value?: boolean | null;
    };

    if (!module || typeof value !== "boolean") {
      return NextResponse.json(
        { error: "Informe module e value (booleano)" },
        { status: 400 }
      );
    }
    if (!MODULES.includes(module as (typeof MODULES)[number])) {
      return NextResponse.json({ error: "Module invalido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "ADMIN sempre tem acesso total" },
        { status: 400 }
      );
    }

    await prisma.userPermission.upsert({
      where: { userId_module: { userId: user.id, module } },
      update: { enabled: value },
      create: { userId: user.id, module, enabled: value },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin user permissions update error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const module = url.searchParams.get("module");
    if (!module || !MODULES.includes(module as (typeof MODULES)[number])) {
      return NextResponse.json({ error: "Module invalido" }, { status: 400 });
    }

    await prisma.userPermission.deleteMany({ where: { userId: id, module } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin user permissions delete error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}