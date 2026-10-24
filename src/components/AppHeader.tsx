"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LiveIndicator } from "./LiveIndicator";
import { Wordmark } from "./Wordmark";

export type NavItem = { href: string; label: string };

export function AppHeader({ portal, nav, userName }: { portal: string; nav: NavItem[]; userName: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="rounded-sm">
          <Wordmark portal={portal} />
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-2.5 py-1.5 text-sm transition-colors ${
                  active ? "bg-cloth-soft font-medium text-cloth-deep" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <LiveIndicator />
          <span className="hidden text-ink-soft sm:inline">{userName}</span>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="rounded-sm px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
