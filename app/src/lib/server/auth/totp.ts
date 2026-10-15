import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "../env";

/**
 * Two-step sign-in with an authenticator app (time-based one-time codes, RFC 6238). The shared secret is kept encrypted
 * with a server key, a code can be used only once, and a person gets single-use recovery codes in case the phone is lost.
 */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = (): string => base32Encode(randomBytes(20));

/** The code for a moment in time. `step` is the number of 30-second periods since 1970. */
export function codeFor(secretBase32: string, step: number, digits: number = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secretBase32)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const bin = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export const stepAt = (now: number): number => Math.floor(now / 1000 / STEP_SECONDS);

/**
 * Whether a code is right now (or one period either side, for clocks that differ a little). Returns the period it matched
 * so the caller can refuse the same period twice.
 */
export function verifyCode(secretBase32: string, code: unknown, now: number, lastUsedStep: number = -1): { ok: true; step: number } | { ok: false } {
  if (typeof code !== "string") return { ok: false };
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return { ok: false };
  const here = stepAt(now);
  for (const step of [here, here - 1, here + 1]) {
    if (step <= lastUsedStep) continue;
    const want = Buffer.from(codeFor(secretBase32, step));
    if (timingSafeEqual(want, Buffer.from(c))) return { ok: true, step };
  }
  return { ok: false };
}

export function otpauthUrl(secretBase32: string, account: string, issuer = "MeriQuest"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}`;
}

/* ------------------------------ secret at rest ------------------------------ */

function key(): Buffer | null {
  const k = getEnv().TOTP_KEY;
  if (!k) return null;
  const raw = Buffer.from(k, "base64");
  return raw.length === 32 ? raw : createHash("sha256").update(k).digest();
}

/** Whether two-step sign-in can be set up here: production needs a server key. */
export const totpAvailable = (): boolean => key() !== null || getEnv().NODE_ENV !== "production";

export function sealSecret(secret: string): string {
  const k = key();
  if (!k) return `plain:${secret}`; // development and tests only (see totpAvailable)
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return `gcm:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function openSecret(sealed: string): string | null {
  if (sealed.startsWith("plain:")) return getEnv().NODE_ENV === "production" ? null : sealed.slice(6);
  const [kind, iv, tag, enc] = sealed.split(":");
  const k = key();
  if (kind !== "gcm" || !k || !iv || !tag || !enc) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ------------------------------ recovery codes ------------------------------ */

const hashRecovery = (code: string) => createHash("sha256").update(`recovery:${code.replace(/[\s-]/g, "").toLowerCase()}`).digest("hex");

/** Ten single-use codes, shown once. Only their hashes are kept. */
export function newRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: 10 }, () => {
    const raw = randomBytes(5).toString("hex");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashRecovery) };
}

/** Returns the remaining hashes when the code is one of them, or null. */
export function consumeRecoveryCode(hashes: string[], code: unknown): string[] | null {
  if (typeof code !== "string" || code.length < 8 || code.length > 20) return null;
  const h = hashRecovery(code);
  return hashes.includes(h) ? hashes.filter((x) => x !== h) : null;
}
