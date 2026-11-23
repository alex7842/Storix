export const USERNAME = "alex";
export const PASSWORD = "alexstorix";
export const COOKIE = "storix_auth";
export const SESSION_SECONDS = 60 * 60; // auto logout after 1 hour

async function sign(exp) {
  const data = new TextEncoder().encode(
    `${exp}:${USERNAME}:${PASSWORD}:${process.env.AUTH_SECRET || "storix"}`
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// token = "<expiry ms>.<signature>"
export async function createToken() {
  const exp = Date.now() + SESSION_SECONDS * 1000;
  return { token: `${exp}.${await sign(exp)}`, exp };
}

export async function verifyToken(token) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;
  return sig === (await sign(exp));
}
