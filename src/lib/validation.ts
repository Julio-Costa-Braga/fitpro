import { z } from "zod";

const nameSchema = z
  .string({ message: "Nome e obrigatorio" })
  .trim()
  .min(1, { message: "Nome e obrigatorio" })
  .max(80);

const emailSchema = z
  .email({ message: "Email invalido" })
  .trim()
  .toLowerCase();

const passwordSchema = z
  .string({ message: "A senha deve ter no minimo 8 caracteres" })
  .min(8, { message: "A senha deve ter no minimo 8 caracteres" })
  .max(128);

const phoneSchema = z.string().trim().max(20).optional().nullable();

export const loginSchema = z.object({
  email: z
    .string({ message: "Email e senha sao obrigatorios" })
    .trim()
    .toLowerCase()
    .min(1, { message: "Email e senha sao obrigatorios" }),
  password: z.string({ message: "Email e senha sao obrigatorios" }).min(1),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["PERSONAL", "NUTRITIONIST"]).optional(),
  referralCode: z.string().trim().min(3).max(20).optional(),
});

export const createAccountSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  role: z.enum(["PERSONAL", "STUDENT"], {
    message: "Role invalida. Use PERSONAL ou STUDENT",
  }).optional(),
  trainerId: z.string().trim().min(1).optional().nullable(),
});

export const createStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional().nullable(),
  phone: phoneSchema,
  password: passwordSchema.optional(),
});

/** Extrai a primeira mensagem de erro de uma validacao Zod. */
export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados invalidos";
}