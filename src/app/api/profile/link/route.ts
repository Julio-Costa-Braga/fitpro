import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, type ApiUser } from "@/lib/authz";

const LINK_TYPES = ["personal", "nutritionist"] as const;
type LinkType = (typeof LINK_TYPES)[number];

async function getStudentWithLinks(user: ApiUser) {
  return prisma.student.findUnique({
    where: { userId: user.userId },
    select: {
      id: true,
      personal: { select: { id: true, name: true, email: true } },
      nutritionist: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["STUDENT"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const student = await getStudentWithLinks(user);
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }

    const pending = await prisma.traineeLinkRequest.findMany({
      where: { studentId: student.id, status: "PENDING" },
      select: {
        id: true,
        type: true,
        createdAt: true,
        professional: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      links: {
        personal: student.personal,
        nutritionist: student.nutritionist,
      },
      pending,
    });
  } catch (error) {
    console.error("Profile links error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request, { roles: ["STUDENT"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const body = await request.json();
    const { code, type } = body as { code?: string; type?: string };
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Informe o codigo" }, { status: 400 });
    }
    if (!LINK_TYPES.includes(type as LinkType)) {
      return NextResponse.json(
        { error: "Informe o tipo de vinculo (personal ou nutritionist)" },
        { status: 400 }
      );
    }
    const linkType = type as LinkType;

    const target = await prisma.user.findUnique({
      where: { referralCode: code.trim().toLowerCase() },
      select: { id: true, name: true, role: true },
    });
    if (!target) {
      return NextResponse.json(
        { error: "Codigo de indicacao nao encontrado" },
        { status: 404 }
      );
    }
    if (
      (linkType === "personal" && target.role !== "PERSONAL") ||
      (linkType === "nutritionist" && target.role !== "NUTRITIONIST")
    ) {
      return NextResponse.json(
        { error: "Codigo nao corresponde ao tipo de profissional informado" },
        { status: 400 }
      );
    }
    if (target.id === user.userId) {
      return NextResponse.json(
        { error: "Nao e possivel se auto-vincular" },
        { status: 400 }
      );
    }

    const student = await getStudentWithLinks(user);
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }

    // Ja vinculado (aceito): recusa novo convite do mesmo tipo.
    const linkedId = linkType === "personal" ? student.personal?.id : student.nutritionist?.id;
    if (linkedId) {
      return NextResponse.json(
        { error: "Voce ja esta vinculado a este tipo de profissional" },
        { status: 400 }
      );
    }

    const existing = await prisma.traineeLinkRequest.findUnique({
      where: {
        studentId_professionalId_type: {
          studentId: student.id,
          professionalId: target.id,
          type: linkType,
        },
      },
    });
    if (existing && existing.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Convite ja enviado e ainda nao respondido" },
        { status: 400 }
      );
    }

    const linkRequest = existing
      ? await prisma.traineeLinkRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING" },
        })
      : await prisma.traineeLinkRequest.create({
          data: {
            studentId: student.id,
            professionalId: target.id,
            type: linkType,
          },
        });

    await prisma.notification.create({
      data: {
        type: "STUDENT_LINKED",
        userId: target.id,
        data: {
          studentName: user.name,
          linkType,
          requestId: linkRequest.id,
        },
      },
    });

    return NextResponse.json(
      { success: true, requestId: linkRequest.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Profile link request error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request, { roles: ["STUDENT"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = auth.user;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as LinkType | null;
    if (!LINK_TYPES.includes(type as LinkType)) {
      return NextResponse.json(
        { error: "Informe o tipo de vinculo (personal ou nutritionist)" },
        { status: 400 }
      );
    }

    const student = await getStudentWithLinks(user);
    if (!student) {
      return NextResponse.json(
        { error: "Registro de aluno nao encontrado" },
        { status: 404 }
      );
    }

    // Cancela convite pendente (se houver) e remove o vinculo aceito.
    await prisma.traineeLinkRequest.deleteMany({
      where: {
        studentId: student.id,
        type: type as string,
        status: "PENDING",
      },
    });

    const updated = await prisma.student.update({
      where: { id: student.id },
      data:
        type === "nutritionist" ? { nutritionistId: null } : { personalId: null },
      select: {
        personal: { select: { id: true, name: true, email: true } },
        nutritionist: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      links: {
        personal: updated.personal,
        nutritionist: updated.nutritionist,
      },
      pending: await prisma.traineeLinkRequest.findMany({
        where: { studentId: student.id, status: "PENDING" },
        select: {
          id: true,
          type: true,
          createdAt: true,
          professional: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    console.error("Profile unlink error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}