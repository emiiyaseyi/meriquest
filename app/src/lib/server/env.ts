import "server-only";
import { z } from "zod";

/**
 * The ONLY place that reads process.env. Secrets never leave the server and are
 * never referenced from client components (RULEBOOK §5.1 items 5 and 7).
 */

// The prototype's publicly committed default password. Must never be used in production.
const BANNED_DEFAULTS = new Set(["Meristem@2026"]);

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    STORE: z.preprocess(emptyToUndefined, z.enum(["file", "memory", "postgres"]).default("file")),
    // The connection string contains the database password: it is read only here, never logged.
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(10).max(1000).optional()),
    // Local files cannot work on serverless hosts, so production must opt in explicitly (for example a single server).
    ALLOW_FILE_STORE: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false")),
    DATA_DIR: z.preprocess(emptyToUndefined, z.string().min(1).max(260).default(".data")),
    DEFAULT_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(12).max(128).optional()),
    // One-time secret for the bootstrap admin only. Kept separate from DEFAULT_PASSWORD, which every
    // new joiner knows, so an insider cannot take over the first admin account.
    BOOTSTRAP_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(12).max(128).optional()),
    // Evidence files: a private Supabase Storage bucket (otherwise the database holds them) and a virus scanner service.
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().max(300).optional()),
    SUPABASE_SERVICE_KEY: z.preprocess(emptyToUndefined, z.string().min(20).max(2000).optional()),
    EVIDENCE_BUCKET: z.preprocess(emptyToUndefined, z.string().min(3).max(63).default("concern-evidence")),
    EVIDENCE_SCANNER_URL: z.preprocess(emptyToUndefined, z.string().url().max(300).optional()),
    EVIDENCE_SCANNER_TOKEN: z.preprocess(emptyToUndefined, z.string().min(8).max(2000).optional()),
    // The certificate of the authority that signed the database host's TLS certificate (PEM), for hosts such as Supabase whose authority is not in the default trust list. Optional; the connection is still fully verified.
    DATABASE_CA_CERT: z.preprocess(emptyToUndefined, z.string().min(100).max(20000).optional()),
    // Encrypts the two-step sign-in secrets. 32 random bytes, base64 (openssl rand -base64 32). Required in production to set up two-step sign-in.
    TOTP_KEY: z.preprocess(emptyToUndefined, z.string().min(32).max(200).optional()),
    SEED_SAMPLE_STAFF: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false")),
    BOOTSTRAP_ADMIN_STAFF_ID: z.preprocess(emptyToUndefined, z.string().max(20).default("MS0001")),
    BOOTSTRAP_ADMIN_EMAIL: z.preprocess(
      emptyToUndefined,
      z.string().email().max(120).default("ld.admin@meristemng.com"),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.STORE === "postgres" && !env.DATABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATABASE_URL is required when STORE=postgres" });
    }
    if (env.NODE_ENV === "production") {
      if (env.STORE === "file" && env.ALLOW_FILE_STORE !== "true") {
        ctx.addIssue({ code: "custom", path: ["STORE"], message: "Production needs STORE=postgres (local files lose data on serverless hosts)" });
      }
      if (!env.DEFAULT_PASSWORD) {
        ctx.addIssue({ code: "custom", path: ["DEFAULT_PASSWORD"], message: "DEFAULT_PASSWORD is required in production" });
      } else if (BANNED_DEFAULTS.has(env.DEFAULT_PASSWORD)) {
        ctx.addIssue({ code: "custom", path: ["DEFAULT_PASSWORD"], message: "DEFAULT_PASSWORD must not be a known/committed value" });
      }
      if (!env.BOOTSTRAP_ADMIN_PASSWORD) {
        ctx.addIssue({ code: "custom", path: ["BOOTSTRAP_ADMIN_PASSWORD"], message: "BOOTSTRAP_ADMIN_PASSWORD is required in production" });
      } else if (env.BOOTSTRAP_ADMIN_PASSWORD === env.DEFAULT_PASSWORD) {
        ctx.addIssue({ code: "custom", path: ["BOOTSTRAP_ADMIN_PASSWORD"], message: "BOOTSTRAP_ADMIN_PASSWORD must differ from DEFAULT_PASSWORD" });
      }
      if (env.STORE === "memory") {
        ctx.addIssue({ code: "custom", path: ["STORE"], message: "STORE=memory is not allowed in production" });
      }
      if (env.SEED_SAMPLE_STAFF === "true") {
        ctx.addIssue({ code: "custom", path: ["SEED_SAMPLE_STAFF"], message: "Sample staff must not be seeded in production" });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    STORE: process.env.STORE,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
    ALLOW_FILE_STORE: process.env.ALLOW_FILE_STORE,
    DATA_DIR: process.env.DATA_DIR,
    DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    EVIDENCE_BUCKET: process.env.EVIDENCE_BUCKET,
    EVIDENCE_SCANNER_URL: process.env.EVIDENCE_SCANNER_URL,
    EVIDENCE_SCANNER_TOKEN: process.env.EVIDENCE_SCANNER_TOKEN,
    TOTP_KEY: process.env.TOTP_KEY,
    SEED_SAMPLE_STAFF: process.env.SEED_SAMPLE_STAFF,
    BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_ADMIN_STAFF_ID: process.env.BOOTSTRAP_ADMIN_STAFF_ID,
    BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
  });
  if (!parsed.success) {
    // Fail closed. Report which variables are wrong, never their values.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server configuration: ${names}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function resetEnvCache(): void {
  cached = null;
}
