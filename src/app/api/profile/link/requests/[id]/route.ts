import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

// Aceita (PUT) ou recusa (DELETE) um convite de vinculo.
// So o profissional alvo do convite (ou ADMIN) pode responder.
async function getAccessibleRequest(user: { userId: string; role: string }, id: string) {
  return prisma.traineeLinkRequest.findFirst({
    where:
      user.role === "ADMIN"
        ? { id }
        : { id, professionalId: user.userId },
    include: { student: true },
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const { id } = await params;
    const req = await getAccessibleRequest(user, id);
    if (!req || req.status !== "PENDING") {
      return NextResponse.json(
        { error: "Convite nao encontrado ou ja respondido" },
        { status: 404 }
      );
    }

    // Vincula so se o aluno ainda nao tiver um profissional aceito do mesmo tipo.
    const field = req.type === "nutritionist" ? "nutritionistId" : "personalId";
    const already = req.student[field as "personalId" | "nutritionistId"];
    if (already) {
      await prisma.traineeLinkRequest.update({
        where: { id: req.id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json(
        { error: "Este aluno ja possui um profissional do tipo vinculado" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.traineeLinkRequest.update({
        where: { id: req.id },
        data: { status: "ACCEPTED" },
      }),
      prisma.student.update({
        where: { id: req.studentId },
        data: { [field]: req.professionalId },
      }),
    ]);

    if (req.student.userId) {
      await prisma.notification.create({
        data: {
          type: "STUDENT_LINKED",
          userId: req.student.userId,
          data: {
            professionalName: user.name,
            linkType: req.type,
            requestId: req.id,
            accepted: true,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept link request error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST", "ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const { id } = await params;
    const req = await getAccessibleRequest(user, id);
    if (!req || req.status !== "PENDING") {
      return NextResponse.json(
        { error: "Convite nao encontrado ou ja respondido" },
        { status: 404 }
      );
    }

    await prisma.traineeLinkRequest.update({
      where: { id: req.id },
      data: { status: "REJECTED" },
    });

    if (req.student.userId) {
      await prisma.notification.create({
        data: {
          type: "STUDENT_LINKED",
          userId: req.student.userId,
          data: {
            linkType: req.type,
            requestId: req.id,
            accepted: false,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject link request error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}