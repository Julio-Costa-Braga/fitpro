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
      where: {
        id: studentId,
        OR:
          user.role === "PERSONAL"
            ? [{ personalId: user.userId }]
            : [{ id: user.userId }],
      },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const progressLogs = await prisma.progressLog.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(progressLogs);
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

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        OR:
          user.role === "PERSONAL"
            ? [{ personalId: user.userId }]
            : [{ id: user.userId }],
      },
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

    return NextResponse.json(progressLog, { status: 201 });
  } catch (error) {
    console.error("Create progress log error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}