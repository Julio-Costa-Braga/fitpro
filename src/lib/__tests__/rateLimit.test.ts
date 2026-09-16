import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("permite requests abaixo do limite", () => {
    expect(checkRateLimit("t:1", 3, 1000).allowed).toBe(true);
    expect(checkRateLimit("t:1", 3, 1000).allowed).toBe(true);
    expect(checkRateLimit("t:1", 3, 1000).allowed).toBe(true);
  });

  it("bloqueia quando o limite e atingido e calcula retryAfterSec", () => {
    checkRateLimit("t:2", 2, 1000);
    checkRateLimit("t:2", 2, 1000);
    vi.advanceTimersByTime(100);
    const res = checkRateLimit("t:2", 2, 1000);
    expect(res.allowed).toBe(false);
    expect(res.retryAfterSec).toBe(1);
  });

  it("libera novamente apos a janela expirar", () => {
    checkRateLimit("t:3", 1, 1000);
    expect(checkRateLimit("t:3", 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("t:3", 1, 1000).allowed).toBe(true);
  });

  it("nao mistura chaves diferentes", () => {
    checkRateLimit("a", 1, 1000);
    expect(checkRateLimit("b", 1, 1000).allowed).toBe(true);
  });
});