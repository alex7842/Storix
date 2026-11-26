import { db, oid } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Server-Sent Events: pushes a message whenever a command in this workspace
// changes. Vercel caps function time, so the stream closes itself before the
// limit and the browser's EventSource reconnects automatically.
export async function GET(req, { params }) {
  const id = oid((await params).id);
  if (!id) return new Response("Not found", { status: 404 });
  const wsId = id.toString();
  const d = await db();
  const enc = new TextEncoder();
  let changeStream, ping, stop, closed = false;

  const close = (controller) => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    clearTimeout(stop);
    changeStream?.close().catch(() => {});
    try { controller?.close(); } catch {}
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (s) => { if (!closed) try { controller.enqueue(enc.encode(s)); } catch {} };
      send("retry: 1000\n: connected\n\n");

      // watch commands and files (not the raw file chunks)
      changeStream = d.watch(
        [{ $match: { "ns.coll": { $in: ["commands", "files"] } } }],
        { fullDocument: "updateLookup" }
      );
      changeStream.on("change", (ch) => {
        const coll = ch.ns.coll;
        // deletes carry no document, so they are always forwarded
        const doc = ch.fullDocument;
        if (doc?.workspaceId && doc.workspaceId.toString() !== wsId) return;
        // a file only appears once its upload is finished
        if (coll === "files" && doc && !doc.complete) return;
        send(`data: ${coll}:${ch.operationType}\n\n`);
      });
      changeStream.on("error", () => close(controller));

      ping = setInterval(() => send(": ping\n\n"), 20000);
      stop = setTimeout(() => close(controller), 280000);
      req.signal.addEventListener("abort", () => close(controller));
    },
    cancel() { close(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
