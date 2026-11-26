import { NextResponse } from "next/server";
import { db, oid } from "@/lib/mongo";

export async function POST(_req, { params }) {
  const fid = oid((await params).fid);
  if (!fid) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = await db();
  const file = await d.collection("files").findOne({ _id: fid });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const have = await d.collection("file_chunks").countDocuments({ fileId: fid });
  if (have !== file.chunks)
    return NextResponse.json({ error: `Upload incomplete (${have}/${file.chunks} chunks)` }, { status: 400 });
  await d.collection("files").updateOne({ _id: fid }, { $set: { complete: true } });
  return NextResponse.json({ ok: true });
}
