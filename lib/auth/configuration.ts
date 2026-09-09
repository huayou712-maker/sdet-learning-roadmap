import "server-only";
export function authConfiguration() {
  const missing = [
    "AUTH_SECRET",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
  ].filter((name) => !process.env[name]);
  return { configured: missing.length === 0, missing };
}
