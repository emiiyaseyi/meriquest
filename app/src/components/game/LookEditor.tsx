"use client";

import { useState } from "react";
import { PersonPortrait } from "./PersonPortrait";
import { saveLookAction } from "@/app/actions/world";
import { BODIES, BOTTOM_COLOURS, FABRICS, HAIR_COLOURS, HAIR_STYLES, OUTFITS, OUTFIT_COLOURS, SKIN_TONES, sameLook } from "@/lib/world/looks";
import type { Skin } from "@/lib/world/types";

function Chips<T extends string>({ label, options, value, onPick }: { label: string; options: { id: T; label: string }[]; value: T | undefined; onPick: (v: T) => void }) {
  return (
    <div className="ed-group">
      <p className="ed-label">{label}</p>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`chip-pick${value === o.id ? " on" : ""}`} onClick={() => onPick(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, colours, value, onPick }: { label: string; colours: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="ed-group">
      <p className="ed-label">{label}</p>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {colours.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={`swatch${value === c ? " on" : ""}`} style={{ background: c }} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}

/** The appearance editor, laid out like the reference game's: a preview on top, then choices, then Save. */
export function LookEditor({ look, onSaved, onDone }: { look: Skin; onSaved: (l: Skin) => void; onDone: () => void }) {
  const [draft, setDraft] = useState<Skin>(look);
  const [facing, setFacing] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchanged = sameLook(draft, look);
  const set = <K extends keyof Skin>(k: K, v: Skin[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (busy || unchanged) return;
    setBusy(true);
    setError(null);
    try {
      const r = await saveLookAction(draft);
      if (r.ok) {
        onSaved(r.look);
        onDone();
      } else setError(r.error);
    } catch {
      setError("Could not save just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="me-stage">
        <PersonPortrait look={draft} size={260} full facing={facing} label="Preview of your character" />
        <button type="button" className="turn-btn" onClick={() => setFacing(facing === 0 ? 1 : 0)}>↻ Turn around</button>
      </div>
      <Chips label="Body" options={BODIES.map((b) => ({ id: b.id, label: b.label }))} value={draft.body} onPick={(v) => set("body", v)} />
      <Chips label="Hairstyle" options={HAIR_STYLES} value={draft.hairStyle === "short" ? "lowcut" : draft.hairStyle === "bun" ? "classic" : draft.hairStyle} onPick={(v) => set("hairStyle", v)} />
      <Chips label="Outfit" options={OUTFITS} value={draft.outfit} onPick={(v) => set("outfit", v)} />
      <Chips label="Fabric" options={FABRICS} value={draft.fabric} onPick={(v) => set("fabric", v)} />
      <Swatches label="Skin tone" colours={SKIN_TONES} value={draft.skin} onPick={(c) => set("skin", c)} />
      <Swatches label="Hair" colours={HAIR_COLOURS} value={draft.hair} onPick={(c) => set("hair", c)} />
      <Swatches label="Outfit colour" colours={OUTFIT_COLOURS} value={draft.top} onPick={(c) => set("top", c)} />
      <Swatches label="Bottoms" colours={BOTTOM_COLOURS} value={draft.pants} onPick={(c) => set("pants", c)} />
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="ed-actions">
        <button type="button" className="me-wide" onClick={onDone}>Cancel</button>
        <button type="button" className="primary-wide" onClick={() => void save()} disabled={unchanged || busy}>{busy ? "Saving…" : unchanged ? "No changes yet" : "Save my look"}</button>
      </div>
    </div>
  );
}
