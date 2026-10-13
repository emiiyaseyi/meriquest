import Image from "next/image";

/**
 * Meristem logo. `light` is the white version for dark green backgrounds; `dark` is the
 * full-colour version for light backgrounds. Brand use is subject to Corporate Communications
 * approval (RULEBOOK §13 item 8).
 */
export function Logo({ variant, width }: { variant: "light" | "dark"; width: number }) {
  const src = variant === "light" ? "/brand/meristem-logo-white.png" : "/brand/meristem-logo.png";
  // `unoptimized`: the files are already sized, and this keeps the image optimizer out of the request path.
  return <Image src={src} alt="Meristem" width={width} height={Math.round((width * 199) / 800)} priority unoptimized />;
}
