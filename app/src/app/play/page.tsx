import { redirect } from "next/navigation";

// The game is now the home screen. This address is kept so old links still work.
export default function PlayPage() {
  redirect("/");
}
