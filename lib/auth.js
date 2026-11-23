export const USERNAME = "alex";
export const PASSWORD = "alexalex";
export const COOKIE = "cmd_auth";

export async function authToken() {
  const data = new TextEncoder().encode(
    `${USERNAME}:${PASSWORD}:${process.env.AUTH_SECRET || "cmd-drop"}`
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
