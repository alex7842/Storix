import { NextResponse } from "next/server";
import { Binary } from "mongodb";
import { db, oid } from "@/lib/mongo";
import { CHUNK_SIZE } from "@/lib/files";

export const dynamic = "force-dynamic";

async function target(params) {
  const p = await params;
  const fid = oid(p.fid);
  const n = Number(p.n);
  if (!fid || !Number.isInteger(n) || n < 0) return {};
  const d = await db();
  const file = await d.collection("files").findOne({ _id: fid });
  if (!file || n >= file.chunks) return {};
  return { d, file, fid, n };
}

export async function PUT(req, { params }) {
  const { d, file, fid, n } = await target(params);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (file.complete) return NextResponse.json({ error: "Upload already finished" }, { status: 409 });

  const buf = Buffer.from(await req.arrayBuffer());
  const expected = n === file.chunks - 1 ? file.size - n * CHUNK_SIZE : CHUNK_SIZE;
  if (buf.length !== expected)
    return NextResponse.json({ error: `Chunk ${n} has wrong size` }, { status: 400 });

  await d.collection("file_chunks").updateOne(
    { fileId: fid, n },
    { $set: { data: new Binary(buf) } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function GET(_req, { params }) {
  const { d, file, fid, n } = await target(params);
  if (!file?.complete) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const chunk = await d.collection("file_chunks").findOne({ fileId: fid, n });
  if (!chunk) return NextResponse.json({ error: "Chunk missing" }, { status: 404 });
  return new Response(chunk.data.buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
