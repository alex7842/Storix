"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, logout } from "@/lib/client";

export default function Home() {
  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const load = () => api("/api/workspaces").then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api("/api/workspaces", { method: "POST", body: { name } });
      setName("");
      load();
    } catch (e) { setErr(e.message); }
  }

  async function remove(w) {
    if (!confirm(`Delete workspace "${w.name}" and all its commands?`)) return;
    await api(`/api/workspaces/${w.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="wrap">
      <div className="bar">
        <h1>Workspaces</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <form className="row" onSubmit={create} style={{ marginBottom: 16, flexWrap: "nowrap" }}>
        <input placeholder="New workspace name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary">Create</button>
      </form>
      {err && <div className="err">{err}</div>}
      {list === null ? <div className="muted">Loading…</div> :
        list.length === 0 ? <div className="muted">No workspaces yet.</div> :
        list.map((w) => (
          <div className="card card-head" key={w.id}>
            <Link href={`/w/${w.id}`} style={{ flex: 1, fontSize: 16 }}>{w.name}</Link>
            <button className="danger" onClick={() => remove(w)}>Delete</button>
          </div>
        ))}
    </div>
  );
}
