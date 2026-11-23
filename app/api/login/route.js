import { NextResponse } from "next/server";
import { USERNAME, PASSWORD, COOKIE, SESSION_SECONDS, createToken } from "@/lib/auth";

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (username !== USERNAME || password !== PASSWORD)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const { token, exp } = await createToken();
  const res = NextResponse.json({ ok: true, exp });
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_SECONDS,
  });
  return res;
}
