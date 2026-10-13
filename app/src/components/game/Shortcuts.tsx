"use client";

const KEYS: { keys: string[]; what: string }[] = [
  { keys: ["M"], what: "Open the map" },
  { keys: ["H"], what: "Go to my Workspace" },
  { keys: ["P"], what: "Work Phone" },
  { keys: ["S"], what: "Your needs and goals" },
  { keys: ["E"], what: "People here" },
  { keys: ["←", "↑", "→", "↓"], what: "Walk (W, A, S and D also work)" },
  { keys: ["["], what: "Turn the view left" },
  { keys: ["]"], what: "Turn the view right" },
  { keys: ["Esc"], what: "Close / cancel" },
  { keys: ["?"], what: "Show these shortcuts" },
];

/** The keyboard shortcuts card, laid out like the reference game's. */
export function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="me-panel" role="dialog" aria-label="Keyboard shortcuts">
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <span className="kbd-badge" aria-hidden="true">⌨️</span>
        <div className="me-id">
          <h2>Keyboard shortcuts</h2>
          <p>Play MeriQuest without a mouse</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        <ul className="keys">
          {KEYS.map((k) => (
            <li key={k.what}>
              <span className="keycaps">{k.keys.map((c) => <kbd key={c}>{c}</kbd>)}</span>
              <span>{k.what}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
