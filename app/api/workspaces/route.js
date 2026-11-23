import { NextResponse } from "next/server";
import { db, clean } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await db();
  const list = await d.collection("workspaces").find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json(list.map(clean));
}

export async function POST(req) {
  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const d = await db();
  const doc = { name: name.trim(), createdAt: new Date() };
  const r = await d.collection("workspaces").insertOne(doc);
  return NextResponse.json(clean({ _id: r.insertedId, ...doc }));
}
