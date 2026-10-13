"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "./ActionForm";

/**
 * A form built from a setting's own rules (its JSON schema), so admins edit values in fields instead of raw JSON:
 * numbers in number boxes, choices in drop-downs, lists with add, remove, duplicate and reorder buttons. The server
 * still checks every value against the same rules before saving, so a form can never save something invalid.
 */
export interface JS {
  type?: string | string[];
  properties?: Record<string, JS>;
  required?: string[];
  items?: JS;
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | JS;
  anyOf?: JS[];
  oneOf?: JS[];
  default?: unknown;
}

type Json = unknown;
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const kind = (s: JS): string => (Array.isArray(s.type) ? (s.type.find((t) => t !== "null") ?? "null") : (s.type ?? (s.enum ? "enum" : s.properties ? "object" : s.items ? "array" : "unknown")));

/** A sensible empty value for a new list item or a newly added field. */
export function blank(s: JS): Json {
  if (s.default !== undefined) return JSON.parse(JSON.stringify(s.default));
  if (s.enum && s.enum.length > 0) return s.enum[0];
  switch (kind(s)) {
    case "string":
      return "";
    case "integer":
    case "number":
      return s.minimum ?? 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object": {
      const out: Record<string, Json> = {};
      for (const k of s.required ?? []) if (s.properties?.[k]) out[k] = blank(s.properties[k]);
      return out;
    }
    default:
      return null;
  }
}

const humanise = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The words shown on a collapsed list item: its name, label, title or id. */
function titleOf(v: Json, i: number): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, Json>;
    for (const k of ["label", "name", "title", "id", "scene", "kind", "text"]) if (typeof o[k] === "string" && o[k]) return String(o[k]).slice(0, 80);
  }
  if (typeof v === "string" && v) return v.slice(0, 80);
  return `Item ${i + 1}`;
}

function Field({ s, v, set, label, hint }: { s: JS; v: Json; set: (n: Json) => void; label: string; hint?: string }) {
  const k = kind(s);
  const id = `f-${label}-${Math.abs(hashCode(label + JSON.stringify(s).length))}`;
  const note = [s.minimum !== undefined && s.maximum !== undefined && s.maximum < 1e9 ? `${s.minimum} to ${s.maximum}` : null, s.maxLength && s.maxLength < 1000 ? `up to ${s.maxLength} characters` : null, s.pattern && s.pattern.includes("a-z") ? "lowercase letters, digits and dashes" : null, hint].filter(Boolean).join(" · ");

  if (s.enum) {
    return (
      <label className="sf-field" htmlFor={id}>
        <span className="sf-label">{label}</span>
        <select id={id} className="input" value={String(v ?? "")} onChange={(e) => set(s.enum?.find((x) => String(x) === e.target.value))}>
          {s.enum.map((o) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
        </select>
      </label>
    );
  }
  if (k === "boolean") {
    return (
      <label className="sf-field sf-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={v === true} onChange={(e) => set(e.target.checked)} />
        <span className="sf-label">{label}</span>
      </label>
    );
  }
  if (k === "integer" || k === "number") {
    return (
      <label className="sf-field" htmlFor={id}>
        <span className="sf-label">{label}</span>
        <input id={id} type="number" className="input" value={typeof v === "number" ? v : ""} min={s.minimum} max={s.maximum} step={k === "integer" ? 1 : "any"} onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} />
        {note ? <span className="sf-note">{note}</span> : null}
      </label>
    );
  }
  if (k === "string") {
    const long = (s.maxLength ?? 0) >= 200 || /story|text|intro|feedback|description|message|note/i.test(label);
    return (
      <label className="sf-field" htmlFor={id}>
        <span className="sf-label">{label}</span>
        {long ? <textarea id={id} className="input" rows={3} value={typeof v === "string" ? v : ""} maxLength={s.maxLength} onChange={(e) => set(e.target.value)} /> : <input id={id} type="text" className="input" value={typeof v === "string" ? v : ""} maxLength={s.maxLength} onChange={(e) => set(e.target.value)} />}
        {note ? <span className="sf-note">{note}</span> : null}
      </label>
    );
  }
  if (k === "array" && s.items) return <List s={s} items={Array.isArray(v) ? v : []} set={set} label={label} />;
  if (k === "object" && s.properties) return <Group s={s} v={(v && typeof v === "object" ? v : {}) as Record<string, Json>} set={set} label={label} />;
  if (k === "object" && typeof s.additionalProperties === "object") return <RecordField s={s.additionalProperties} v={(v && typeof v === "object" ? v : {}) as Record<string, Json>} set={set} label={label} />;
  return <RawField v={v} set={set} label={label} />;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

/** Anything the form does not know how to draw is edited as JSON, for that one value only. */
function RawField({ v, set, label }: { v: Json; set: (n: Json) => void; label: string }) {
  const [text, setText] = useState(JSON.stringify(v ?? null, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <label className="sf-field">
      <span className="sf-label">{label} (JSON)</span>
      <textarea className="input code" rows={5} value={text} spellCheck={false} onChange={(e) => { setText(e.target.value); try { set(JSON.parse(e.target.value)); setBad(false); } catch { setBad(true); } }} />
      {bad ? <span className="sf-note" style={{ color: "#a33" }}>Not valid JSON yet</span> : null}
    </label>
  );
}

function Group({ s, v, set, label }: { s: JS; v: Record<string, Json>; set: (n: Json) => void; label: string }) {
  const req = new Set(s.required ?? []);
  const entries = Object.entries(s.properties ?? {});
  return (
    <fieldset className="sf-group">
      {label ? <legend>{label}</legend> : null}
      <div className="sf-grid">
        {entries.map(([key, sub]) => {
          const present = v[key] !== undefined;
          const optional = !req.has(key) && sub.default === undefined;
          const text = humanise(key);
          if (optional && !present) {
            return (
              <div key={key} className="sf-field">
                <span className="sf-label">{text}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ ...v, [key]: blank(sub) })}>Add</button>
              </div>
            );
          }
          const wide = ["array", "object"].includes(kind(sub)) || (kind(sub) === "string" && /story|text|intro|feedback|description|note/i.test(key));
          return (
            <div key={key} className={wide ? "sf-wide" : ""}>
              <Field s={sub} v={v[key]} set={(n) => set({ ...v, [key]: n })} label={text} />
              {optional ? <button type="button" className="sf-link" onClick={() => { const { [key]: _x, ...rest } = v; void _x; set(rest); }}>Remove {text.toLowerCase()}</button> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function RecordField({ s, v, set, label }: { s: JS; v: Record<string, Json>; set: (n: Json) => void; label: string }) {
  const keys = Object.keys(v);
  const rename = (from: string, to: string) => {
    const out: Record<string, Json> = {};
    for (const k of keys) out[k === from ? to : k] = v[k];
    set(out);
  };
  return (
    <fieldset className="sf-group">
      <legend>{label}</legend>
      {keys.map((k) => (
        <div key={k} className="sf-row">
          <input className="input" aria-label={`${label} name`} value={k} onChange={(e) => rename(k, e.target.value)} />
          <div className="sf-grow"><Field s={s} v={v[k]} set={(n) => set({ ...v, [k]: n })} label="Value" /></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const { [k]: _x, ...rest } = v; void _x; set(rest); }}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ ...v, [`new-${keys.length + 1}`]: blank(s) })}>Add</button>
    </fieldset>
  );
}

function List({ s, items, set, label }: { s: JS; items: Json[]; set: (n: Json) => void; label: string }) {
  const item = s.items as JS;
  const simple = ["string", "integer", "number", "boolean"].includes(kind(item)) || !!item.enum;
  const [open, setOpen] = useState<Set<number>>(() => new Set(items.length <= 2 ? items.map((_, i) => i) : []));
  const max = s.maxItems ?? 1000;
  const toggle = (i: number) => setOpen((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
    setOpen(new Set());
  };
  const dup = (i: number) => {
    const c = clone(items[i]);
    if (c && typeof c === "object" && !Array.isArray(c) && typeof (c as Record<string, Json>).id === "string") (c as Record<string, Json>).id = `${(c as Record<string, string>).id}-copy`;
    set([...items.slice(0, i + 1), c, ...items.slice(i + 1)]);
    setOpen(new Set([i + 1]));
  };
  const remove = (i: number) => {
    set(items.filter((_, x) => x !== i));
    setOpen(new Set());
  };
  return (
    <fieldset className="sf-group">
      <legend>{label} <span className="sf-count">({items.length})</span></legend>
      {items.map((it, i) => (
        <div key={i} className={`sf-item${simple ? " simple" : ""}`}>
          {simple ? (
            <div className="sf-row">
              <div className="sf-grow"><Field s={item} v={it} set={(n) => set(items.map((x, j) => (j === i ? n : x)))} label={`${label} ${i + 1}`} /></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label={`Remove ${label} ${i + 1}`}>Remove</button>
            </div>
          ) : (
            <>
              <div className="sf-item-head">
                <button type="button" className="sf-title" onClick={() => toggle(i)} aria-expanded={open.has(i)}>
                  <span aria-hidden="true">{open.has(i) ? "▾" : "▸"}</span> {titleOf(it, i)}
                </button>
                <span className="sf-tools">
                  <button type="button" className="sf-link" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button type="button" className="sf-link" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
                  <button type="button" className="sf-link" onClick={() => dup(i)} disabled={items.length >= max}>Duplicate</button>
                  <button type="button" className="sf-link danger" onClick={() => remove(i)}>Remove</button>
                </span>
              </div>
              {open.has(i) ? <div className="sf-item-body"><Field s={item} v={it} set={(n) => set(items.map((x, j) => (j === i ? n : x)))} label="" /></div> : null}
            </>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" disabled={items.length >= max} onClick={() => { set([...items, blank(item)]); setOpen((o) => new Set(o).add(items.length)); }}>Add {label.toLowerCase().replace(/s$/, "")}</button>
    </fieldset>
  );
}

export function SchemaForm({ configKey, schema, initial, initialJson, saveAction, resetAction }: { configKey: string; schema: JS; initial: Json; initialJson: string; saveAction: Action; resetAction: Action }) {
  const [value, setValue] = useState<Json>(initial);
  const [mode, setMode] = useState<"form" | "json">("form");
  const [text, setText] = useState(initialJson);
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const [saveState, save, saving] = useActionState(saveAction, {});
  const [resetState, reset, resetting] = useActionState(resetAction, {});

  const toJson = () => {
    setText(JSON.stringify(value, null, 2));
    setMode("json");
  };
  const toForm = () => {
    try {
      setValue(JSON.parse(text));
      setJsonErr(null);
      setMode("form");
    } catch {
      setJsonErr("That is not valid JSON, so the form cannot show it yet.");
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className={`btn btn-sm ${mode === "form" ? "" : "btn-ghost"}`} onClick={mode === "form" ? undefined : toForm} aria-pressed={mode === "form"}>Form</button>
        <button type="button" className={`btn btn-sm ${mode === "json" ? "" : "btn-ghost"}`} onClick={mode === "json" ? undefined : toJson} aria-pressed={mode === "json"}>Advanced: JSON</button>
      </div>
      {jsonErr ? <p role="alert" className="msg msg-error">{jsonErr}</p> : null}
      <form action={save} className="stack">
        <input type="hidden" name="key" value={configKey} />
        {mode === "form" ? (
          <>
            <input type="hidden" name="json" value={JSON.stringify(value ?? null)} />
            <Field s={schema} v={value} set={setValue} label="" />
          </>
        ) : (
          <>
            <label htmlFor="json" className="label">Value (JSON)</label>
            <textarea id="json" name="json" value={text} onChange={(e) => setText(e.target.value)} rows={24} spellCheck={false} className="code" maxLength={400000} />
          </>
        )}
        <div className="row">
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
        {saveState.error ? <pre role="alert" className="msg msg-error pre">{saveState.error}</pre> : null}
        {saveState.ok ? <p role="status" className="msg msg-ok">{saveState.ok}</p> : null}
      </form>
      <form
        action={reset}
        onSubmit={(e) => {
          if (!window.confirm("Restore the original default for this setting? Your current value is kept in history.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="key" value={configKey} />
        <button type="submit" className="btn btn-ghost" disabled={resetting}>Restore default</button>
        {resetState.error ? <pre role="alert" className="msg msg-error pre">{resetState.error}</pre> : null}
        {resetState.ok ? <p role="status" className="msg msg-ok">{resetState.ok}</p> : null}
      </form>
    </div>
  );
}
