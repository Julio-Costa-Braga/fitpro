import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken, type UserRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha sao obrigatorios" },
        { status: 400 }
      );
    }

    if (!["PERSONAL", "STUDENT"].includes(role)) {
      return NextResponse.json(
        { error: "Role invalida. Use PERSONAL ou STUDENT" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as UserRole,
      },
    });

    if (role === "STUDENT") {
      // Vincula ao cadastro já criado pelo personal (mesmo email), ou cria um registro sem trainer por enquanto.
      const existingStudent = await prisma.student.findFirst({
        where: { email },
        orderBy: { createdAt: "asc" },
      });

      if (existingStudent) {
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: { userId: user.id },
        });
      } else {
        await prisma.student.create({
          data: {
            name: user.name,
            email: user.email,
            phone: user.phone,
            userId: user.id,
          },
        });
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
