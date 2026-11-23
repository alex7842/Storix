import { NextResponse } from "next/server";
import { USERNAME, PASSWORD, COOKIE, authToken } from "@/lib/auth";

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (username !== USERNAME || password !== PASSWORD)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await authToken(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
