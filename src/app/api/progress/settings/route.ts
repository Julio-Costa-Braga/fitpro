import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorize(request, {
      roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"],
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user;

    const body = await request.json().catch(() => ({}));
    const { studentId, reviewFrequencyDays } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }
    const format = Number(reviewFrequencyDays);
    if (!Number.isInteger(format) || format < 7 || format > 365) {
      return NextResponse.json(
        { error: "Periodo de reavaliacao deve ser um numero inteiro entre 7 e 365 dias" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: studentId }
          : user.role === "NUTRITIONIST"
            ? { id: studentId, nutritionistId: user.userId }
            : { id: studentId, personalId: user.userId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Frequencia independente por profissional. ADMIN atualiza o valor padrao do aluno.
    if (user.role === "ADMIN") {
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: { reviewFrequencyDays: format },
      });
      return NextResponse.json({ reviewFrequencyDays: updated.reviewFrequencyDays });
    }

    const setting = await prisma.studentProfessionalSetting.upsert({
      where: {
        studentId_professionalId: { studentId, professionalId: user.userId },
      },
      create: { studentId, professionalId: user.userId, reviewFrequencyDays: format },
      update: { reviewFrequencyDays: format },
    });

    return NextResponse.json({ reviewFrequencyDays: setting.reviewFrequencyDays });
  } catch (error) {
    console.error("Update progress settings error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}