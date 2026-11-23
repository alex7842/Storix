"use client";
import { useState } from "react";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (r.ok) location.href = "/";
    else setErr("Invalid credentials");
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>Cmd Drop</h1>
      <input placeholder="Username" value={username} onChange={(e) => setU(e.target.value)} autoFocus />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setP(e.target.value)} />
      <button className="primary">Login</button>
      {err && <div className="err">{err}</div>}
    </form>
  );
}
