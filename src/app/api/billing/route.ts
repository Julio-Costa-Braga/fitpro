import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/authz";
import { REFERRAL_DISCOUNT, EXTRA_STUDENT_PRICE } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const auth = await authorize(request, { roles: ["PERSONAL", "NUTRITIONIST"] });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        lifetime: true,
        paidUntil: true,
        studentLimit: true,
        monthlyPrice: true,
        referralCode: true,
        referralDiscountMonths: true,
        referralDiscountExpiresAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Desconto de indicacao expira na data registrada.
    let referralMonths = user.referralDiscountMonths;
    let referralExpiresAt = user.referralDiscountExpiresAt;
    if (
      referralMonths > 0 &&
      referralExpiresAt &&
      referralExpiresAt.getTime() <= Date.now() &&
      !user.lifetime
    ) {
      referralMonths = 0;
      referralExpiresAt = null;
      await prisma.user.update({
        where: { id: auth.user.userId },
        data: { referralDiscountMonths: 0, referralDiscountExpiresAt: null },
        select: { id: true },
      });
    }

    const [studentsCount, payments] = await Promise.all([
      prisma.student.count({
        where: {
          OR: [
            { personalId: auth.user.userId },
            { nutritionistId: auth.user.userId },
          ],
        },
      }),
      prisma.payment.findMany({
        where: { userId: auth.user.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    const extraStudents = Math.max(0, studentsCount - user.studentLimit);
    const hasDiscount = referralMonths > 0;
    const baseFee = user.lifetime ? 0 : hasDiscount ? user.monthlyPrice - REFERRAL_DISCOUNT : user.monthlyPrice;
    const extraFee = user.lifetime ? 0 : extraStudents * EXTRA_STUDENT_PRICE;
    const totalFee = user.lifetime ? 0 : baseFee + extraFee;

    return NextResponse.json({
      plan: {
        ...user,
        referralDiscountMonths: referralMonths,
        referralDiscountExpiresAt: referralExpiresAt,
        extraStudents,
        baseFee,
        extraFee,
        totalFee,
        role: auth.user.role,
      },
      studentsCount,
      payments,
    });
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}