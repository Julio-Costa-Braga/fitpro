import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateReferralCode, slugSeed } from "../src/lib/referral";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, referralCode: true, paidUntil: true, lifetime: true } });
  let updated = 0;
  for (const user of users) {
    const data: {
      referralCode?: string;
      paidUntil?: Date;
      lifetime?: boolean;
    } = {};
    if (user.referralCode === null) {
      let code = generateReferralCode(user.name);
      const existing = await prisma.user.findUnique({ where: { referralCode: code } });
      if (existing && existing.id !== user.id) {
        code = `${code}-${slugSeed(user.id)}`;
      }
      data.referralCode = code;
    }
    if (user.role === "ADMIN") {
      if (!user.lifetime) data.lifetime = true;
    } else if (user.paidUntil === null) {
      data.paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data });
      updated++;
    }
  }
  console.log(`Registros normalizados (plano/codigo): ${updated}/${users.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());