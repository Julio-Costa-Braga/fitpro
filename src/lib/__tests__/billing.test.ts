import { describe, it, expect } from "vitest";
import {
  trialUntil,
  monthlyFeeFor,
  extraStudentsFee,
  totalMonthlyFee,
  MONTHLY_FEE,
  REFERRAL_DISCOUNT,
} from "@/lib/billing";

describe("billing", () => {
  it("trialUntil soma 7 dias", () => {
    const base = new Date("2026-09-01T00:00:00Z");
    const res = trialUntil(base);
    expect(res.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("monthlyFeeFor aplica desconto de indicacao", () => {
    expect(monthlyFeeFor(true)).toBe(MONTHLY_FEE - REFERRAL_DISCOUNT);
    expect(monthlyFeeFor(false)).toBe(MONTHLY_FEE);
  });

  it("extraStudentsFee cobra so excedente", () => {
    expect(extraStudentsFee(12, 10, false)).toBe(4);
    expect(extraStudentsFee(10, 10, false)).toBe(0);
    expect(extraStudentsFee(15, 10, true)).toBe(0);
  });

  it("totalMonthlyFee combina desconto + excedente", () => {
    expect(totalMonthlyFee(12, 10, 22, false, false)).toBe(26);
    expect(totalMonthlyFee(12, 10, 22, true, false)).toBe(23);
    expect(totalMonthlyFee(12, 10, 22, false, true)).toBe(0);
  });
});