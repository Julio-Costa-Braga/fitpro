import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, studentWhereOwned } from "@/lib/authz";
import { sendPushToUser } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Cada profissional ve SOMENTE o que ele registrou. Registros legados (professionalId null) sao do personal.
    const professionalFilter =
      user.role === "PERSONAL"
        ? { OR: [{ professionalId: user.userId }, { professionalId: null }] }
        : user.role === "NUTRITIONIST"
          ? { professionalId: user.userId }
          : undefined;

    const progressLogs = await prisma.progressLog.findMany({
      where: { studentId, ...professionalFilter },
      include: {
        professional: { select: { id: true, name: true, role: true } },
      },
      orderBy: { date: "desc" },
    });

    // Reavaliacao: proxima data a partir da ultima avaliacao + frequencia (em dias).
    const base = progressLogs.length > 0 ? progressLogs[0].date : student.createdAt;
    const nextReviewDate = new Date(
      base.getTime() + student.reviewFrequencyDays * 24 * 60 * 60 * 1000
    );
    const overdue = nextReviewDate.getTime() < Date.now();

    return NextResponse.json({
      progress: progressLogs,
      reviewFrequencyDays: student.reviewFrequencyDays,
      nextReviewDate: nextReviewDate.toISOString(),
      overdue,
    });
  } catch (error) {
    console.error("Progress logs error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const body = await request.json();
    const { date, weight, bodyFat, chest, waist, arm, thigh, notes, photoUrl, studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }
      const student = await prisma.student.findFirst({
      where: studentWhereOwned(user, studentId),
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const progressLog = await prisma.progressLog.create({
      data: {
        date: date ? new Date(date) : undefined,
        weight: weight ?? undefined,
        bodyFat: bodyFat ?? undefined,
        chest: chest ?? undefined,
        waist: waist ?? undefined,
        arm: arm ?? undefined,
        thigh: thigh ?? undefined,
        notes,
        photoUrl,
        studentId,
        professionalId: user.role === "ADMIN" ? null : user.userId,
      },
    });

    // Notifica o aluno que uma nova avaliacao foi registrada.
    if (student.userId) {
      await prisma.notification.create({
        data: {
          type: "PROGRESS_REVIEW",
          userId: student.userId,
          data: {
            studentId,
            progressId: progressLog.id,
            date: progressLog.date.toISOString(),
          },
        },
      });
      await sendPushToUser(
        student.userId,
        "FitPro",
        user.role === "NUTRITIONIST"
          ? "Sua nutricionista registrou novo progresso."
          : "Seu personal registrou novo progresso.",
        "/progress"
      );
    }

    return NextResponse.json(progressLog, { status: 201 });
  } catch (error) {
    console.error("Create progress log error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}