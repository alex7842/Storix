import { NextResponse } from "next/server";
import { verifyToken, COOKIE } from "./lib/auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login")) return NextResponse.next();
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
