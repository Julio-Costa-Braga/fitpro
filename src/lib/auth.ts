import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

export type UserRole = "ADMIN" | "PERSONAL" | "NUTRITIONIST" | "STUDENT";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export const TOKEN_COOKIE_NAME = "fitpro_token";
export const TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function cookieAttributes() {
  return `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TOKEN_COOKIE_MAX_AGE}`;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.headers.set(
    "Set-Cookie",
    `${TOKEN_COOKIE_NAME}=${token}; ${cookieAttributes()}`
  );
}

export function clearAuthCookie(response: NextResponse): void {
  response.headers.set(
    "Set-Cookie",
    `${TOKEN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookie = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  return cookie || null;
}

export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
