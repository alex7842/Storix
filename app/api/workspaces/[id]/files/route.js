import { NextResponse } from "next/server";
import { db, oid, clean } from "@/lib/mongo";
import { CHUNK_SIZE, MAX_FILE_SIZE } from "@/lib/files";

export const dynamic = "force-dynamic";

const out = (f) => ({ ...clean(f), workspaceId: f.workspaceId.toString() });

export async function GET(_req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json([], { status: 404 });
  const d = await db();

  // clean up uploads that were abandoned more than a day ago
  const stale = await d.collection("files")
    .find({ complete: false, createdAt: { $lt: new Date(Date.now() - 864e5) } }, { projection: { _id: 1 } })
    .toArray();
  if (stale.length) {
    const ids = stale.map((s) => s._id);
    await d.collection("file_chunks").deleteMany({ fileId: { $in: ids } });
    await d.collection("files").deleteMany({ _id: { $in: ids } });
  }

  const list = await d.collection("files")
    .find({ workspaceId: id, complete: true }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(list.map(out));
}

// Starts an upload: registers the file, then the browser PUTs each chunk.
export async function POST(req, { params }) {
  const id = oid((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { name, size, type } = await req.json().catch(() => ({}));
  if (!name || !Number.isInteger(size) || size < 0)
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  if (size > MAX_FILE_SIZE)
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` }, { status: 413 });

  const d = await db();
  await d.collection("file_chunks").createIndex({ fileId: 1, n: 1 }, { unique: true });
  const doc = {
    workspaceId: id,
    name: String(name).slice(0, 255),
    size,
    type: type || "application/octet-stream",
    chunks: Math.ceil(size / CHUNK_SIZE),
    complete: false,
    createdAt: new Date(),
  };
  const r = await d.collection("files").insertOne(doc);
  return NextResponse.json({ ...out({ _id: r.insertedId, ...doc }), chunkSize: CHUNK_SIZE });
}
