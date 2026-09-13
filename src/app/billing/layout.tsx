import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, TOKEN_COOKIE_NAME } from "@/lib/auth";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== "PERSONAL") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}