import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigEditor } from "@/components/ConfigEditor";
import { CONFIG, isConfigKey } from "@/lib/server/config/definitions";
import { getConfigJson, getConfigMeta } from "@/lib/server/config/registry";
import { resetConfigAction, saveConfigAction } from "@/app/admin/actions";

export default async function ConfigEditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // The URL segment is user input: only known registry keys are accepted.
  if (!isConfigKey(key)) notFound();
  const def = CONFIG[key];
  const [json, meta] = await Promise.all([getConfigJson(key), getConfigMeta(key)]);
  return (
    <>
      <p><Link href="/admin/config">← All settings</Link></p>
      <h1>{def.label}</h1>
      <p className="muted">{def.description}</p>
      <p className="muted">
        {meta.version === 0 ? "Using the built-in default." : `Version ${meta.version}, last changed by ${meta.updatedBy ?? "unknown"}.`}
      </p>
      <ConfigEditor configKey={key} initialJson={json} saveAction={saveConfigAction} resetAction={resetConfigAction} />
    </>
  );
}
