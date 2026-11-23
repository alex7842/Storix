"use client";
import { useEffect } from "react";

// Sends the user back to the login page when the 1-hour session ends,
// even if the page is just sitting open.
export function useAutoLogout() {
  useEffect(() => {
    let exp = 0;
    try { exp = Number(localStorage.getItem("storix_exp")) || 0; } catch {}
    if (!exp) return;
    const t = setTimeout(logout, Math.max(0, exp - Date.now()));
    return () => clearTimeout(t);
  }, []);
}

export async function api(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("unauthorized");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback for browsers/contexts without clipboard API
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

export async function logout() {
  try { localStorage.removeItem("storix_exp"); } catch {}
  await fetch("/api/logout", { method: "POST" });
  location.href = "/login";
}
