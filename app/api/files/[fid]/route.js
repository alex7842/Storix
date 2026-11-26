import { NextResponse } from "next/server";
import { db, oid } from "@/lib/mongo";

export async function DELETE(_req, { params }) {
  const fid = oid((await params).fid);
  if (!fid) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = await db();
  await d.collection("file_chunks").deleteMany({ fileId: fid });
  await d.collection("files").deleteOne({ _id: fid });
  return NextResponse.json({ ok: true });
}
