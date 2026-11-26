"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api, copyText, logout, useAutoLogout } from "@/lib/client";
import Files from "./files";

function Command({ c, onChange }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [content, setContent] = useState(c.content);

  async function copy() {
    if (await copyText(c.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }
  async function save() {
    await api(`/api/commands/${c.id}`, { method: "PATCH", body: { title, content } });
    setEditing(false);
    onChange();
  }
  async function remove() {
    await api(`/api/commands/${c.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <strong>{c.title || "Untitled"}</strong>{" "}
          <span className="muted">{new Date(c.createdAt).toLocaleString()}</span>
        </div>
        <div className="row">
          <button className="primary" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
          <button onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</button>
          <button className="danger" onClick={remove}>Delete</button>
        </div>
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
          <div><button className="primary" onClick={save}>Save</button></div>
        </div>
      ) : (
        <pre>{c.content}</pre>
      )}
    </div>
  );
}

export default function Workspace({ params }) {
  useAutoLogout();
  const { id } = use(params);
  const [ws, setWs] = useState(null);
  const [list, setList] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");

  const [files, setFiles] = useState(null);

  const load = () => api(`/api/workspaces/${id}/commands`).then(setList).catch((e) => setErr(e.message));
  const loadFiles = () => api(`/api/workspaces/${id}/files`).then(setFiles).catch((e) => setErr(e.message));
  const loadAll = () => { load(); loadFiles(); };
  useEffect(() => {
    api(`/api/workspaces/${id}`).then(setWs).catch((e) => setErr(e.message));
    loadAll();
  }, [id]);

  // live updates: reload the list whenever the server reports a change
  const [live, setLive] = useState(false);
  useEffect(() => {
    const es = new EventSource(`/api/workspaces/${id}/stream`);
    let first = true;
    es.onopen = () => {
      setLive(true);
      if (!first) loadAll(); // catch up on anything missed while reconnecting
      first = false;
    };
    es.onmessage = (e) => (e.data.startsWith("files") ? loadFiles() : load());
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [id]);

  async function add(e) {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await api(`/api/workspaces/${id}/commands`, { method: "POST", body: { title, content } });
      setTitle("");
      setContent("");
      load();
    } catch (e) { setErr(e.message); }
  }

  async function clearAll() {
    if (!list?.length || !confirm(`Clear all ${list.length} commands in this workspace?`)) return;
    await api(`/api/workspaces/${id}/commands`, { method: "DELETE" });
    load();
  }

  return (
    <div className="wrap">
      <div className="bar">
        <div>
          <Link href="/">← Workspaces</Link>
          <h1>
            {ws?.name || "…"}{" "}
            <span className="muted" style={{ color: live ? "#4ade80" : "#888" }}>
              ● {live ? "Live" : "Connecting…"}
            </span>
          </h1>
        </div>
        <div className="row">
          <button onClick={loadAll}>Refresh</button>
          <button className="danger" onClick={clearAll} disabled={!list?.length}>Clear all</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <form className="card" onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Paste command / text here" value={content} onChange={(e) => setContent(e.target.value)} />
        <div><button className="primary">Post</button></div>
      </form>
      <Files wsId={id} files={files} reload={loadFiles} />
      {err && <div className="err">{err}</div>}
      {list === null ? <div className="muted">Loading…</div> :
        list.length === 0 ? <div className="muted">No commands yet.</div> :
        list.map((c) => <Command key={c.id} c={c} onChange={load} />)}
    </div>
  );
}
