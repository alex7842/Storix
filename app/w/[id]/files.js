"use client";
import { useRef, useState } from "react";
import { api, copyText } from "@/lib/client";
import { CHUNK_SIZE, MAX_FILE_SIZE, MAX_VIEW_SIZE, viewKind, formatSize } from "@/lib/files";

async function withRetry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) { if (i >= tries) throw e; }
  }
}

async function uploadFile(wsId, file, onProgress) {
  const f = await api(`/api/workspaces/${wsId}/files`, {
    method: "POST",
    body: { name: file.name, size: file.size, type: file.type },
  });
  try {
    for (let n = 0; n < f.chunks; n++) {
      const part = file.slice(n * CHUNK_SIZE, (n + 1) * CHUNK_SIZE);
      await withRetry(async () => {
        const r = await fetch(`/api/files/${f.id}/chunks/${n}`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: part,
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Chunk ${n} failed`);
      });
      onProgress((n + 1) / f.chunks);
    }
    await api(`/api/files/${f.id}/complete`, { method: "POST" });
  } catch (e) {
    fetch(`/api/files/${f.id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }
}

async function fetchFile(f, onProgress) {
  const parts = [];
  for (let n = 0; n < f.chunks; n++) {
    const buf = await withRetry(async () => {
      const r = await fetch(`/api/files/${f.id}/chunks/${n}`);
      if (!r.ok) throw new Error(`Download failed at chunk ${n}`);
      return r.arrayBuffer();
    });
    parts.push(buf);
    onProgress?.((n + 1) / f.chunks);
  }
  return new Blob(parts, { type: f.type || "application/octet-stream" });
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function Viewer({ view, onClose }) {
  const [copied, setCopied] = useState(false);
  const { f, kind, url, text } = view;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <strong style={{ wordBreak: "break-all" }}>{f.name}</strong>
          <div className="row">
            {kind === "text" && (
              <button className="primary" onClick={async () => {
                if (await copyText(text)) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
              }}>{copied ? "Copied!" : "Copy"}</button>
            )}
            <button onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="modal-body">
          {kind === "text" && <pre>{text}</pre>}
          {kind === "image" && <img src={url} alt={f.name} style={{ maxWidth: "100%" }} />}
          {kind === "video" && <video src={url} controls style={{ maxWidth: "100%" }} />}
          {kind === "audio" && <audio src={url} controls />}
          {kind === "pdf" && <iframe src={url} title={f.name} style={{ width: "100%", height: "75vh", border: 0 }} />}
        </div>
      </div>
    </div>
  );
}

function FileRow({ f, onChange, onView }) {
  const [busy, setBusy] = useState("");
  const kind = f.size <= MAX_VIEW_SIZE ? viewKind(f) : null;
  const pct = (p) => `${Math.round(p * 100)}%`;

  async function download() {
    try {
      setBusy("0%");
      saveBlob(await fetchFile(f, (p) => setBusy(pct(p))), f.name);
    } catch (e) { alert(e.message); }
    setBusy("");
  }
  async function view() {
    try {
      setBusy("0%");
      const blob = await fetchFile(f, (p) => setBusy(pct(p)));
      if (kind === "text") onView({ f, kind, text: await blob.text() });
      else onView({ f, kind, url: URL.createObjectURL(blob) });
    } catch (e) { alert(e.message); }
    setBusy("");
  }
  async function remove() {
    await api(`/api/files/${f.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="file-row">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ wordBreak: "break-all" }}>📄 {f.name}</div>
        <span className="muted">{formatSize(f.size)} · {new Date(f.createdAt).toLocaleString()}</span>
      </div>
      <div className="row">
        {busy && <span className="muted" style={{ alignSelf: "center" }}>{busy}</span>}
        {kind && <button onClick={view} disabled={!!busy}>View</button>}
        <button className="primary" onClick={download} disabled={!!busy}>Download</button>
        <button className="danger" onClick={remove} disabled={!!busy}>Delete</button>
      </div>
    </div>
  );
}

export default function Files({ wsId, files, reload }) {
  const input = useRef(null);
  const [uploads, setUploads] = useState([]); // {key, name, progress, error}
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState(null);

  const patch = (key, p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function start(fileList) {
    const items = [...fileList].map((file) => ({ file, key: `${Date.now()}-${Math.random()}` }));
    setUploads((u) => [...u, ...items.map(({ file, key }) => ({ key, name: file.name, progress: 0 }))]);
    for (const { file, key } of items) {
      if (file.size > MAX_FILE_SIZE) {
        patch(key, { error: `Too large (max ${formatSize(MAX_FILE_SIZE)})` });
        continue;
      }
      try {
        await uploadFile(wsId, file, (p) => patch(key, { progress: p }));
        setUploads((u) => u.filter((x) => x.key !== key));
        reload();
      } catch (e) {
        patch(key, { error: e.message });
      }
    }
  }

  function closeView() {
    if (view?.url) URL.revokeObjectURL(view.url);
    setView(null);
  }

  return (
    <div className="card">
      <div className="card-head">
        <strong>Files</strong>
        <button className="primary" onClick={() => input.current.click()}>Upload files</button>
        <input ref={input} type="file" multiple hidden
          onChange={(e) => { start(e.target.files); e.target.value = ""; }} />
      </div>

      <div
        className={`drop${drag ? " drag" : ""}`}
        onClick={() => input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); start(e.dataTransfer.files); }}
      >
        Drop any files here (zip, tar, anything) · max {formatSize(MAX_FILE_SIZE)} each
      </div>

      {uploads.map((u) => (
        <div key={u.key} className="file-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ wordBreak: "break-all" }}>⬆ {u.name}</div>
            {u.error
              ? <span className="err">{u.error}</span>
              : <div className="progress"><div style={{ width: `${Math.round(u.progress * 100)}%` }} /></div>}
          </div>
          {u.error && <button onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>Dismiss</button>}
        </div>
      ))}

      {files === null ? <div className="muted">Loading…</div> :
        files.length === 0 && uploads.length === 0 ? <div className="muted">No files yet.</div> :
        files.map((f) => <FileRow key={f.id} f={f} onChange={reload} onView={setView} />)}

      {view && <Viewer view={view} onClose={closeView} />}
    </div>
  );
}
