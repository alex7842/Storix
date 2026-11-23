import { NextResponse } from "next/server";
import { db, oid, clean } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ws = await (await db()).collection("workspaces").findOne({ _id: id });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(clean(ws));
}

export async function DELETE(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = await db();
  await d.collection("commands").deleteMany({ workspaceId: id });
  await d.collection("workspaces").deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
