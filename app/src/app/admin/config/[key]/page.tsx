import { requireArea } from "@/lib/server/auth/dal";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SchemaForm, type JS } from "@/components/SchemaForm";
import { CONFIG, isConfigKey } from "@/lib/server/config/definitions";
import { getConfigJson, getConfigMeta } from "@/lib/server/config/registry";
import { resetConfigAction, saveConfigAction } from "@/app/admin/actions";

export default async function ConfigEditPage({ params }: { params: Promise<{ key: string }> }) {
  // Every admin page checks its own area: a layout is not a security boundary
  await requireArea("settings");
  const { key } = await params;
  // The URL segment is user input: only known registry keys are accepted.
  if (!isConfigKey(key)) notFound();
  const def = CONFIG[key];
  const [json, meta] = await Promise.all([getConfigJson(key), getConfigMeta(key)]);
  // The form is drawn from the setting's own rules; the server checks every value against the same rules on save
  const schema = JSON.parse(JSON.stringify(z.toJSONSchema(def.schema, { unrepresentable: "any", io: "input" }))) as JS;
  return (
    <>
      <p><Link href="/admin/config">← All settings</Link></p>
      <h1>{def.label}</h1>
      <p className="muted">{def.description}</p>
      <p className="muted">
        {meta.version === 0 ? "Using the built-in default." : `Version ${meta.version}, last changed by ${meta.updatedBy ?? "unknown"}.`}
      </p>
      <SchemaForm configKey={key} schema={schema} initial={JSON.parse(json)} initialJson={json} saveAction={saveConfigAction} resetAction={resetConfigAction} />
    </>
  );
}
