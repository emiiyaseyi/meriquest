"use client";

import { useState } from "react";

export type MapPick = "hq" | "yaba" | "academy";

interface Pill {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  pick?: MapPick;
}

/** Places on the map. Only the ones with a `pick` can be opened; the rest are scenery names, as on the reference map. */
const PILLS: Pill[] = [
  { id: "hq", label: "Meristem HQ, Ikoyi", icon: "🏢", x: 470, y: 290, pick: "hq" },
  { id: "yaba", label: "Yaba office", icon: "🏬", x: 700, y: 170, pick: "yaba" },
  { id: "academy", label: "Meristem Academy", icon: "🎓", x: 300, y: 400, pick: "academy" },
  { id: "park", label: "Lagoon Park", icon: "🌳", x: 180, y: 240 },
  { id: "market", label: "City Market", icon: "🧺", x: 820, y: 360 },
  { id: "beach", label: "Beach", icon: "🏖️", x: 600, y: 520 },
  { id: "stadium", label: "Stadium", icon: "🏟️", x: 430, y: 110 },
];

const TABS = [
  { id: "lagos", label: "Lagos", open: true },
  { id: "ph", label: "Port Harcourt", open: false },
  { id: "abuja", label: "Abuja", open: false },
];

/** An isometric block: a top and two sides. */
function Block({ x, y, w, d, h, top, left, right }: { x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  const a = `${x},${y - h}`;
  const b = `${x + w},${y - h + w / 2}`;
  const c = `${x + w - d},${y - h + w / 2 + d / 2}`;
  const e = `${x - d},${y - h + d / 2}`;
  return (
    <g>
      <polygon points={`${e} ${c} ${x + w - d},${y + w / 2 + d / 2} ${x - d},${y + d / 2}`} fill={left} />
      <polygon points={`${c} ${b} ${x + w},${y + w / 2} ${x + w - d},${y + w / 2 + d / 2}`} fill={right} />
      <polygon points={`${a} ${b} ${c} ${e}`} fill={top} />
    </g>
  );
}

const Tree = ({ x, y }: { x: number; y: number }) => (
  <g aria-hidden="true">
    <rect x={x - 2} y={y} width="4" height="10" fill="#7a5a3a" />
    <circle cx={x} cy={y - 4} r="11" fill="#3f8f4f" />
    <circle cx={x - 5} cy={y - 8} r="7" fill="#4fa55d" />
  </g>
);

const TREES: [number, number][] = [[140, 300], [160, 330], [210, 280], [560, 400], [640, 440], [760, 250], [880, 300], [900, 420], [330, 200], [250, 470], [720, 480]];

/**
 * The city map, drawn like the reference game's: a bright illustrated city seen from above with name pills.
 * Tap a pill to open that place. City tabs sit at the top; cities other than Lagos are marked as coming.
 */
export function CityMap({ onPick, onClose }: { onPick: (p: MapPick) => void; onClose: () => void }) {
  const [soon, setSoon] = useState<string | null>(null);
  return (
    <div className="citymap" role="dialog" aria-label="Map">
      <header className="citymap-bar">
        <div className="citymap-tabs" role="tablist" aria-label="Cities">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === "lagos"} className={`citymap-tab${t.id === "lagos" ? " on" : ""}`} onClick={() => setSoon(t.open ? null : t.label)}>
              {t.label}
              {t.open ? " 📍" : ""}
            </button>
          ))}
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close map">✕</button>
      </header>
      {soon ? <p className="citymap-note" role="status">{soon} opens in a later update.</p> : null}
      <div className="citymap-stage">
        <svg viewBox="0 0 1000 620" className="citymap-svg" role="img" aria-label="Illustrated map of Lagos" preserveAspectRatio="xMidYMid slice">
          <rect width="1000" height="620" fill="#9fd08a" />
          <path d="M0 470 C 200 420, 330 520, 520 480 S 860 430, 1000 500 L1000 620 L0 620 Z" fill="#7cc4e6" />
          <path d="M0 500 C 220 460, 350 550, 540 515 S 860 470, 1000 540 L1000 620 L0 620 Z" fill="#5fb0d8" />
          <path d="M610 0 C 640 120, 560 180, 600 300 S 640 400, 610 470 L 690 470 C 720 400, 680 300, 700 220 S 720 80, 700 0 Z" fill="#7cc4e6" />
          <g stroke="#cfd6cf" strokeWidth="14" strokeLinecap="round" fill="none">
            <path d="M40 340 L 330 220 L 560 330 L 900 190" />
            <path d="M330 220 L 300 420" />
            <path d="M560 330 L 600 460" />
          </g>
          <g stroke="#fff" strokeWidth="2" strokeDasharray="10 12" fill="none" opacity=".8">
            <path d="M40 340 L 330 220 L 560 330 L 900 190" />
          </g>
          <ellipse cx="190" cy="270" rx="70" ry="38" fill="#7fc276" />
          <polygon points="790,350 880,330 910,370 820,392" fill="#e9b872" />
          <ellipse cx="440" cy="130" rx="60" ry="28" fill="#d9d6c8" />
          <ellipse cx="440" cy="130" rx="38" ry="16" fill="#79b86d" />
          <Block x={470} y={300} w={70} d={44} h={80} top="#e7efe8" left="#b8cdbd" right="#92ae9a" />
          <Block x={520} y={290} w={40} d={30} h={50} top="#dfe9e1" left="#a9c1af" right="#86a38f" />
          <Block x={700} y={180} w={64} d={40} h={46} top="#eef1ea" left="#c4cdbf" right="#a4b19e" />
          <Block x={300} y={410} w={60} d={38} h={34} top="#f4e7b5" left="#d9c27a" right="#bfa75e" />
          <Block x={590} y={510} w={34} d={22} h={14} top="#f6d9a7" left="#e0bd82" right="#c8a46a" />
          {TREES.map(([x, y]) => <Tree key={`${x}-${y}`} x={x} y={y} />)}
        </svg>
        {PILLS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`map-pill${p.pick ? "" : " scenery"}${p.pick === "academy" ? " academy" : ""}`}
            style={{ left: `${p.x / 10}%`, top: `${p.y / 6.2}%` }}
            onClick={() => (p.pick ? onPick(p.pick) : undefined)}
            disabled={!p.pick}
            aria-label={p.pick ? `Open ${p.label}` : p.label}
          >
            <span aria-hidden="true">{p.icon}</span> {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
