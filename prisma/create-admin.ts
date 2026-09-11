import { PrismaClient, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@fitpro.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ja existe (${email}). Nada a fazer.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      password: hashSync("123456", 10),
      role: UserRole.ADMIN,
    },
  });
  console.log(`Admin criado: ${email} (senha: 123456)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());