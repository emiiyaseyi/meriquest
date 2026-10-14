/** Read the person's own data from a plain request (see lib/server/api.ts). Throws on any failure so callers can ignore it quietly. */
export async function getMine<T>(path: "game" | "decor" | "location" | "shift" | "sim", query = ""): Promise<T> {
  const res = await fetch(`/api/me/${path}${query}`, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return (await res.json()) as T;
}
