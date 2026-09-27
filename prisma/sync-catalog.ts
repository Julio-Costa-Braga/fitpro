import { PrismaClient } from "@prisma/client";
import { CATALOG } from "./catalog";

const prisma = new PrismaClient();

const RENAMES: Record<string, string> = {
  "Alongamento do Corredor": "Mobilidade do Corredor",
  "Alongamento de Posterior": "Posterior",
  "Alongamento de Panturrilha na Parede": "Panturrilha na Parede",
  "Alongamento de Quadriceps": "Quadriceps",
  "Alongamento de Gluteo Sentado": "Gluteo Sentado",
  "Alongamento de Flexor do Quadril": "Flexor do Quadril",
  "Alongamento Lateral do Pescoço": "Pescoço Lateral",
  "Alongamento de Peito": "Peito",
  "Alongamento Lombar": "Lombar",
  "Alongamento do Sapo": "Mobilidade do Sapo",
  "Alongamento de Triceps": "Triceps",
  "Alongamento de Ombro Posterior": "Ombro Posterior",
  "Alongamento de Posterior deitado": "Posterior deitado",
  "Alongamento Lateral de Quadriceps": "Quadriceps Lateral",
  "Alongamento Dinamico de Peito": "Peito Dinâmico",
  "Alongamento de Coxa na Cadeira": "Coxa na Cadeira",
  "Alongamento de Panturrilha Sentado": "Panturrilha Sentado",
  "Alongamento de Quadril e Quadriceps": "Quadril e Quadriceps",
};

async function main() {
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const target = await prisma.exercise.findFirst({
      where: { name: newName },
    });
    if (target) {
      console.warn(`skip rename (destino ja existe): ${newName}`);
      continue;
    }
    const ex = await prisma.exercise.findFirst({
      where: { name: oldName, isPreset: true },
    });
    if (ex) {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { name: newName },
      });
      console.log(`renamed: ${oldName} -> ${newName}`);
    } else {
      console.warn(`skip rename (nao encontrado): ${oldName}`);
    }
  }

  for (const e of CATALOG) {
    const existing = await prisma.exercise.findFirst({
      where: { name: e.name },
    });
    if (!existing) {
      await prisma.exercise.create({ data: { ...e, isPreset: true } });
      console.log(`created: ${e.name}`);
    } else if (existing.isPreset) {
      const changed =
        existing.muscleGroup !== e.muscleGroup ||
        (e.gifUrl && existing.gifUrl !== e.gifUrl) ||
        (e.description && existing.description !== e.description);
      if (changed) {
        await prisma.exercise.update({
          where: { id: existing.id },
          data: {
            muscleGroup: e.muscleGroup,
            gifUrl: e.gifUrl || existing.gifUrl,
            description: e.description || existing.description,
          },
        });
        console.log(`updated: ${e.name}`);
      }
    }
  }
}

main()
  .then(() => console.log("Catalogo sincronizado."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());