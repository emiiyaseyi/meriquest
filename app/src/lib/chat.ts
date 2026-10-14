/** Chat rules that are safe in the browser and on the server: cleaning text, the word filter, and conversation ids. */

/** Collapse look-alikes so "1d1ot" and "idiot" match the same blocked word. */
export function normaliseForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function cleanMessage(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|ng|io|co|me|ly|app|xyz)\b/i;

export type Verdict = { ok: true } | { ok: false; reason: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a message may be posted. Returns a polite reason, never the matched word. */
export function checkMessage(text: string, opts: { blockedWords: string[]; blockLinks: boolean }): Verdict {
  if (text.length === 0) return { ok: false, reason: "Please write something first." };
  const flat = normaliseForFilter(text);
  // Letters spaced out to dodge the filter ("i d i o t") are joined back into a word
  const spaced = /(?:^|\s)(?:[a-z0-9]\s){2,}[a-z0-9](?=\s|$)/g;
  const joined = flat.replace(spaced, (m) => " " + m.replace(/\s/g, "") + " ");
  for (const w of opts.blockedWords) {
    const word = normaliseForFilter(w).trim();
    if (!word) continue;
    const re = new RegExp("(^|\\s)" + escapeRe(word) + "(\\s|$)");
    if (re.test(flat) || re.test(joined)) {
      return { ok: false, reason: "That message was not sent because it may break the respectful conduct rules. Please reword it." };
    }
  }
  if (opts.blockLinks && URL_RE.test(text)) return { ok: false, reason: "Links are not allowed in chats." };
  return { ok: true };
}

/** The conversation id of two people (the same whichever way round). */
export const dmId = (a: string, b: string): string => `d:${[a, b].sort().join(":")}`;
export const groupId = (id: string): string => `g:${id}`;
export const isDm = (conv: string): boolean => conv.startsWith("d:");
export const CONV_RE = /^(g:[a-z][a-z0-9-]{0,40}|d:[A-Za-z0-9]{1,20}:[A-Za-z0-9]{1,20})$/;
