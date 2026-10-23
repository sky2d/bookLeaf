import type { Metadata } from "next";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-site relative paths are honoured, so `?next=` can't be used as an open redirect. */
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-start justify-center px-4 pt-[12vh] pb-16">
      <div className="w-full max-w-[400px]">
        <Wordmark />
        <h1 className="mt-10 font-serif text-[28px] leading-tight font-semibold tracking-tight">Sign in to your account</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Authors can check royalties, follow their books and talk to our support team. BookLeaf staff use the same page.
        </p>
        <LoginForm next={safeNext(next)} />
      </div>
    </main>
  );
}
