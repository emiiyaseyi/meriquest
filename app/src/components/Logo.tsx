import Image from "next/image";

/**
 * Meristem logo. Original size is 2676 x 664. `dark` is the original file, unmodified. `light` is the
 * same artwork for dark green backgrounds: the lettering and outer leaves are white and the lime
 * leaf keeps its colour. Never recolour, redraw, stretch or crop it. Brand use is subject to
 * Corporate Communications approval (RULEBOOK §13 item 8).
 */
const RATIO = 664 / 2676;

export function Logo({ variant, width }: { variant: "light" | "dark"; width: number }) {
  const src = variant === "light" ? "/brand/meristem-logo-white.png" : "/brand/meristem-logo.png";
  // `unoptimized`: keeps the original pixels exactly as supplied (no resizing by the image optimizer).
  return <Image src={src} alt="Meristem" width={width} height={Math.round(width * RATIO)} priority unoptimized />;
}
