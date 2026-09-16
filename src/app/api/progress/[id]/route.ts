import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, type ApiUser } from "@/lib/authz";

type RouteContext = { params: Promise<{ id: string }> };

function ownsProgressLog(user: ApiUser, log: {
  professionalId: string | null;
  student: { userId: string | null; personalId: string | null; nutritionistId: string | null };
}): boolean {
  if (user.role === "PERSONAL")
    return !!log.student.personalId &&
      log.student.personalId === user.userId &&
      (!log.professionalId || log.professionalId === user.userId);
  if (user.role === "NUTRITIONIST")
    return !!log.student.nutritionistId &&
      log.student.nutritionistId === user.userId &&
      (!log.professionalId || log.professionalId === user.userId);
  if (user.role === "STUDENT") return log.student.userId === user.userId;
  return user.role === "ADMIN";
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (!ownsProgressLog(user, progressLog)) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    const { student, ...log } = progressLog;
    return NextResponse.json(log);
  } catch (error) {
    console.error("Get progress log error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (!ownsProgressLog(user, progressLog)) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    const body = await request.json();

    const updated = await prisma.progressLog.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        weight: body.weight ?? undefined,
        bodyFat: body.bodyFat ?? undefined,
        chest: body.chest ?? undefined,
        waist: body.waist ?? undefined,
        arm: body.arm ?? undefined,
        thigh: body.thigh ?? undefined,
        notes: body.notes ?? undefined,
        photoUrl: body.photoUrl ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update progress log error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (!ownsProgressLog(user, progressLog)) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    await prisma.progressLog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete progress log error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}