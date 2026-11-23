import { NextResponse } from "next/server";
import { db, oid } from "@/lib/mongo";

export async function PATCH(req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { title, content } = await req.json().catch(() => ({}));
  const set = {};
  if (typeof title === "string") set.title = title.trim();
  if (typeof content === "string") set.content = content;
  await (await db()).collection("commands").updateOne({ _id: id }, { $set: set });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await (await db()).collection("commands").deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
