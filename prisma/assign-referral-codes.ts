import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateReferralCode, slugSeed } from "../src/lib/referral";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, referralCode: true } });
  let updated = 0;
  for (const user of users) {
    let code = generateReferralCode(user.name);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (existing && existing.id !== user.id) {
      code = `${code}-${slugSeed(user.id)}`;
    }
    const data: {
      referralCode: string;
      paidUntil?: Date;
      lifetime?: boolean;
    } = { referralCode: code };
    if (user.referralCode === null) {
      if (user.role === "ADMIN") {
        data.lifetime = true;
      } else {
        data.paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }
    await prisma.user.update({ where: { id: user.id }, data });
    updated++;
  }
  console.log(`Registros atualizados (referral + plano): ${updated}/${users.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());