import { NextResponse } from "next/server";
import { db, oid, clean } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const out = (c) => ({ ...clean(c), workspaceId: c.workspaceId.toString() });

export async function GET(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json([], { status: 404 });
  const list = await (await db()).collection("commands")
    .find({ workspaceId: id }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(list.map(out));
}

export async function POST(req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { title, content } = await req.json().catch(() => ({}));
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  const doc = { workspaceId: id, title: (title || "").trim(), content, createdAt: new Date() };
  const r = await (await db()).collection("commands").insertOne(doc);
  return NextResponse.json(out({ _id: r.insertedId, ...doc }));
}

export async function DELETE(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await (await db()).collection("commands").deleteMany({ workspaceId: id });
  return NextResponse.json({ ok: true, deleted: r.deletedCount });
}
