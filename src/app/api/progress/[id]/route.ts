import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (user.role === "PERSONAL" || user.role === "NUTRITIONIST") {
      const owned =
        user.role === "NUTRITIONIST"
          ? progressLog.student.nutritionistId === user.userId
          : progressLog.student.personalId === user.userId;
      const ownsLog =
        !progressLog.professionalId || progressLog.professionalId === user.userId;
      if (!owned || !ownsLog) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
    } else if (user.role === "STUDENT") {
      if (progressLog.student.id !== user.userId) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (user.role === "PERSONAL" || user.role === "NUTRITIONIST") {
      const owned =
        user.role === "NUTRITIONIST"
          ? progressLog.student.nutritionistId === user.userId
          : progressLog.student.personalId === user.userId;
      const ownsLog =
        !progressLog.professionalId || progressLog.professionalId === user.userId;
      if (!owned || !ownsLog) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
    } else if (user.role === "STUDENT") {
      if (progressLog.student.id !== user.userId) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const progressLog = await prisma.progressLog.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!progressLog) {
      return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
    }

    if (user.role === "PERSONAL" || user.role === "NUTRITIONIST") {
      const owned =
        user.role === "NUTRITIONIST"
          ? progressLog.student.nutritionistId === user.userId
          : progressLog.student.personalId === user.userId;
      const ownsLog =
        !progressLog.professionalId || progressLog.professionalId === user.userId;
      if (!owned || !ownsLog) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
    } else if (user.role === "STUDENT") {
      if (progressLog.student.id !== user.userId) {
        return NextResponse.json({ error: "Progress log not found" }, { status: 404 });
      }
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