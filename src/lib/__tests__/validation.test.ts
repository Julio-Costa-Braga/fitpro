import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  createAccountSchema,
  createStudentSchema,
  firstValidationMessage,
} from "@/lib/validation";

describe("validation", () => {
  it("loginSchema rejeita sem email/password", () => {
    const res = loginSchema.safeParse({});
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(firstValidationMessage(res.error)).toContain("obrigatorios");
    }
  });

  it("loginSchema normaliza email para minusculas", () => {
    const res = loginSchema.safeParse({ email: "  Foo@Bar.COM ", password: "x" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("foo@bar.com");
    }
  });

  it("registerSchema exige senha >= 8", () => {
    const res = registerSchema.safeParse({
      name: "Ana",
      email: "ana@teste.com",
      password: "123",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(firstValidationMessage(res.error)).toContain("8 caracteres");
    }
  });

  it("registerSchema rejeita role invalida", () => {
    const res = registerSchema.safeParse({
      name: "Ana",
      email: "ana@teste.com",
      password: "12345678",
      role: "ADMIN",
    });
    expect(res.success).toBe(false);
  });

  it("createAccountSchema aceita ADMIN sem role explicita", () => {
    const res = createAccountSchema.safeParse({
      name: "Pedro",
      email: "pedro@teste.com",
      password: "12345678",
    });
    expect(res.success).toBe(true);
  });

  it("createAccountSchema rejeita trainerId vazio", () => {
    const res = createAccountSchema.safeParse({
      name: "Pedro",
      email: "pedro@teste.com",
      password: "12345678",
      trainerId: "   ",
    });
    expect(res.success).toBe(false);
  });

  it("createStudentSchema permite sem email", () => {
    const res = createStudentSchema.safeParse({ name: "Joao", password: "12345678" });
    expect(res.success).toBe(true);
  });

  it("createStudentSchema rejeita email invalido", () => {
    const res = createStudentSchema.safeParse({ name: "Joao", email: "nao-e-email" });
    expect(res.success).toBe(false);
  });
});