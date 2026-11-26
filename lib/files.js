// Shared by server and browser.
// Vercel caps request/response bodies at 4.5 MB, so files move in 3 MB chunks.
export const CHUNK_SIZE = 3 * 1024 * 1024;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // free Atlas M0 holds 512 MB total
export const MAX_VIEW_SIZE = 25 * 1024 * 1024;

const TEXT_EXT = /\.(txt|log|md|sh|bash|zsh|ps1|bat|cmd|py|js|mjs|cjs|ts|tsx|jsx|json|ya?ml|toml|ini|cfg|conf|env|xml|html?|css|csv|tsv|sql|go|rs|java|c|h|cpp|hpp|cs|rb|php|pl|lua|tf|hcl|dockerfile|gitignore|properties|service|pem|pub|crt)$/i;
const TEXT_NAMES = /^(dockerfile|makefile|readme|license|\.env.*|\.bashrc|\.profile|hosts|authorized_keys|known_hosts)$/i;

export function viewKind(f) {
  const t = f.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t === "application/pdf") return "pdf";
  if (t.startsWith("text/") || t === "application/json" || t === "application/xml" ||
      TEXT_EXT.test(f.name) || TEXT_NAMES.test(f.name)) return "text";
  return null;
}

export function formatSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
