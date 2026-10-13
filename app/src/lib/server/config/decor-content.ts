/** The starting Workspace catalogue. Admins can rename, add, reprice or remove anything under Settings. */
type Item = { id: string; category: string; name: string; icon: string; w: number; d: number; stars: number; price: number; effect?: { need: string; cut: number } };

const item = (id: string, category: string, name: string, icon: string, w: number, d: number, stars: number, price: number, effect?: { need: string; cut: number }): Item => ({ id, category, name, icon, w, d, stars, price, ...(effect ? { effect } : {}) });

export const DEFAULT_DECOR = {
  settings: { gridW: 8, gridD: 6, maxPlaced: 30, maxHelpPerNeed: 0.5 },
  categories: [
    { id: "desk", label: "Desk", icon: "🖥️" },
    { id: "comfort", label: "Comfort", icon: "🛋️" },
    { id: "plants", label: "Plants", icon: "🪴" },
    { id: "tech", label: "Tech", icon: "💻" },
    { id: "wall", label: "Wall art", icon: "🖼️" },
    { id: "light", label: "Light", icon: "💡" },
  ],
  items: [
    item("plain-desk", "desk", "Plain desk", "🗄️", 2, 1, 0, 6),
    item("standing-desk", "desk", "Standing desk", "🧍", 2, 1, 1, 24, { need: "energy", cut: 0.08 }),
    item("corner-desk", "desk", "Corner desk", "📐", 2, 2, 2, 40),
    item("pen-tray", "desk", "Pen tray", "🖊️", 1, 1, 0, 3),
    item("desk-organiser", "desk", "Desk organiser", "🗂️", 1, 1, 0, 5, { need: "focus", cut: 0.05 }),
    item("filing-cabinet", "desk", "Filing cabinet", "🗃️", 1, 1, 1, 12),
    item("office-chair", "comfort", "Office chair", "💺", 1, 1, 0, 8),
    item("ergonomic-chair", "comfort", "Ergonomic chair", "🪑", 1, 1, 2, 30, { need: "energy", cut: 0.1 }),
    item("small-sofa", "comfort", "Small sofa", "🛋️", 2, 1, 2, 36, { need: "mood", cut: 0.08 }),
    item("rug", "comfort", "Floor rug", "🟫", 2, 2, 1, 14),
    item("standing-fan", "comfort", "Standing fan", "🌀", 1, 1, 0, 10, { need: "mood", cut: 0.05 }),
    item("water-bottle", "comfort", "Water bottle station", "🚰", 1, 1, 0, 7, { need: "hydration", cut: 0.12 }),
    item("small-plant", "plants", "Desk plant", "🌱", 1, 1, 0, 4, { need: "mood", cut: 0.04 }),
    item("fern", "plants", "Fern", "🌿", 1, 1, 1, 9, { need: "mood", cut: 0.06 }),
    item("palm", "plants", "Potted palm", "🌴", 1, 1, 2, 18, { need: "mood", cut: 0.08 }),
    item("flowers", "plants", "Fresh flowers", "💐", 1, 1, 1, 8),
    item("laptop-stand", "tech", "Laptop stand", "💻", 1, 1, 0, 9, { need: "focus", cut: 0.06 }),
    item("second-screen", "tech", "Second screen", "🖥️", 1, 1, 2, 28, { need: "focus", cut: 0.1 }),
    item("headset", "tech", "Headset", "🎧", 1, 1, 1, 14, { need: "focus", cut: 0.06 }),
    item("desk-speaker", "tech", "Desk speaker", "🔊", 1, 1, 1, 12),
    item("framed-values", "wall", "Framed Meristem values", "🖼️", 1, 1, 0, 5, { need: "recognition", cut: 0.05 }),
    item("whiteboard", "wall", "Whiteboard", "📋", 2, 1, 1, 16, { need: "growth", cut: 0.06 }),
    item("wall-clock", "wall", "Wall clock", "🕰️", 1, 1, 0, 4),
    item("skyline-print", "wall", "Lagos skyline print", "🏙️", 2, 1, 2, 20),
    item("desk-lamp", "light", "Desk lamp", "🔦", 1, 1, 0, 6, { need: "focus", cut: 0.04 }),
    item("floor-lamp", "light", "Floor lamp", "💡", 1, 1, 1, 14),
    item("string-lights", "light", "String lights", "✨", 2, 1, 1, 10, { need: "mood", cut: 0.05 }),
    item("lantern", "light", "Brass lantern", "🏮", 1, 1, 2, 18),
  ],
};
