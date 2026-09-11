import { createHash, randomBytes } from "crypto";

export function generateReferralCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12) || "aluno";
  const suffix = randomBytes(3).toString("hex").slice(0, 4);
  return `${base}${suffix}`;
}

export function slugSeed(seed: string): string {
  return createHash("sha1").update(seed).digest("hex").slice(0, 6);
}