import "server-only";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import type { Identity } from "@/lib/github/authz";
export function testMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_ADAPTER === "1" &&
    !!process.env.E2E_SECRET &&
    !process.env.GITHUB_WRITE_TOKEN
  );
}
export async function identity(): Promise<Identity> {
  const jar = await cookies();
  if (testMode() && jar.get("e2e-owner")?.value === process.env.E2E_SECRET)
    return { login: "huayou712-maker" };
  if (!process.env.AUTH_SECRET) return null;
  const req = new NextRequest(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    { headers: { cookie: jar.toString() } },
  );
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: (
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      ""
    ).startsWith("https://"),
  });
  return typeof token?.githubLogin === "string"
    ? { login: token.githubLogin }
    : null;
}
