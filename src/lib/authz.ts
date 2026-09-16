import { NextRequest } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, type UserRole, type TokenPayload } from "@/lib/auth";
import { buildEffectiveModules, type ModuleName } from "@/lib/permissions";

export type ApiUser = TokenPayload & { isActive: boolean };

// Dedupado por request: carrega as permissoes efetivas (role + user) uma unica vez.
const loadModules = cache(async (userId: string, role: UserRole) => {
  const [roleRows, userRows] = await Promise.all([
    prisma.modulePermission.findMany({ where: { role } }),
    prisma.userPermission.findMany({ where: { userId } }),
  ]);
  return buildEffectiveModules(role, roleRows, userRows);
});

/**
 * Sempre reler o usuario do banco (role/isActive atuais) para nao confiar no JWT:
 * desativar conta, mudar role ou trocar senha passa a valer na proxima chamada.
 */
export async function freshUser(request: NextRequest): Promise<ApiUser | null> {
  const payload = getUserFromRequest(request);
  if (!payload) return null;

  const db = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!db || !db.isActive) return null;

  return {
    userId: db.id,
    email: payload.email,
    role: db.role,
    name: payload.name,
    isActive: db.isActive,
  };
}

export async function canUseModule(user: ApiUser, module: ModuleName): Promise<boolean> {
  const modules = await loadModules(user.userId, user.role);
  return modules.includes(module);
}

export type AuthResult =
  | { ok: true; user: ApiUser }
  | { ok: false; status: number; error: string };

export interface AuthorizeOptions {
  roles?: UserRole[];
  module?: ModuleName;
}

export async function authorize(
  request: NextRequest,
  opts: AuthorizeOptions = {}
): Promise<AuthResult> {
  const user = await freshUser(request);
  if (!user) return { ok: false, status: 401, error: "Nao autenticado" };

  if (opts.roles && !opts.roles.includes(user.role)) {
    return { ok: false, status: 403, error: "Acesso negado" };
  }

  if (opts.module) {
    const allowed = await canUseModule(user, opts.module);
    if (!allowed) return { ok: false, status: 403, error: "Acesso negado" };
  }

  return { ok: true, user };
}

// Where-clauses de ownership de aluno reutilizados por todas as rotas de dados.
export function studentWhereOwned(user: ApiUser, studentId: string) {
  if (user.role === "ADMIN") return { id: studentId };
  if (user.role === "PERSONAL") return { id: studentId, personalId: user.userId };
  if (user.role === "NUTRITIONIST") return { id: studentId, nutritionistId: user.userId };
  return { id: studentId, userId: user.userId };
}

export async function findOwnedStudent(user: ApiUser, studentId: string) {
  return prisma.student.findFirst({ where: studentWhereOwned(user, studentId) });
}