import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homePathFor } from "@/shared/routes";

/** `/` has no content of its own: send people to their portal, or to sign in. */
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? homePathFor(session.user.role) : "/login");
}
