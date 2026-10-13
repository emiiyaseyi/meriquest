import type { NeedKey } from "@/lib/world/player";

/** How each need looks in the HUD and in the Me panel. */
export const NEED_ICON: Record<NeedKey, string> = { energy: "⚡", focus: "🎯", mood: "😊", social: "🤝", hunger: "🍲", hydration: "💧", growth: "🌱", recognition: "🌟" };
export const NEED_COLOUR: Record<NeedKey, string> = { energy: "#2f6fe0", focus: "#1fa89a", mood: "#e0a31b", social: "#e0488a", hunger: "#e07a2f", hydration: "#2fa8e0", growth: "#6aa84f", recognition: "#8a5cd6" };
