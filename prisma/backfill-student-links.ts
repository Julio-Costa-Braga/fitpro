import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling student -> user links...");

  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, email: true },
  });

  let linked = 0;
  for (const u of users) {
    if (!u.email) continue;
    const student = await prisma.student.findFirst({
      where: { email: u.email },
    });
    if (student && !student.userId) {
      await prisma.student.update({
        where: { id: student.id },
        data: { userId: u.id },
      });
      linked++;
      console.log(`  - linked ${u.email}`);
    }
  }

  console.log(`Done. ${linked} students linked.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());