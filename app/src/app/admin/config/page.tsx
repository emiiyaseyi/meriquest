import { requireArea } from "@/lib/server/auth/dal";
import Link from "next/link";
import type { Metadata } from "next";
import { CONFIG, CONFIG_KEYS } from "@/lib/server/config/definitions";
import { getConfigMeta } from "@/lib/server/config/registry";

export const metadata: Metadata = { title: "Settings" };

export default async function ConfigList() {
  // Every admin page checks its own area: a layout is not a security boundary
  await requireArea("settings");
  const rows = await Promise.all(CONFIG_KEYS.map(async (k) => ({ key: k, def: CONFIG[k], meta: await getConfigMeta(k) })));
  const groups = [...new Set(rows.map((r) => r.def.group))];
  return (
    <>
      <h1>Settings</h1>
      <p className="muted">Everything here can be changed without a code release. Changes are validated, versioned and audited.</p>
      {groups.map((g) => (
        <section key={g} className="stack">
          <h2>{g}</h2>
          <div className="cards">
            {rows
              .filter((r) => r.def.group === g)
              .map((r) => (
                <Link key={r.key} href={`/admin/config/${r.key}`} className="card">
                  <h3>{r.def.label}</h3>
                  <p className="muted">{r.def.description}</p>
                  <p>
                    <span className="badge">{r.meta.version === 0 ? "default" : `v${r.meta.version}`}</span>
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
