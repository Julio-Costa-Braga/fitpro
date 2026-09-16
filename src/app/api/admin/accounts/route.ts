import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["ADMIN"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lifetime: true,
        paidUntil: true,
        referralCode: true,
        referralDiscountMonths: true,
        studentLimit: true,
        monthlyPrice: true,
        createdAt: true,
        referredByUser: { select: { id: true, name: true } },
        myTrainer: { select: { id: true, name: true } },
        studentRecord: { select: { personal: { select: { id: true, name: true } } } },
        _count: { select: { students: true, myReferrals: true, nutritionStudents: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin accounts error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}