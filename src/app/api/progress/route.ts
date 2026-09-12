import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: studentId }
          : user.role === "PERSONAL"
            ? { id: studentId, personalId: user.userId }
            : { id: studentId, userId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const progressLogs = await prisma.progressLog.findMany({
      where: { studentId },
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, weight, bodyFat, chest, waist, arm, thigh, notes, photoUrl, studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    if (user.role !== "PERSONAL" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const student = await prisma.student.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: studentId }
          : { id: studentId, personalId: user.userId },
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