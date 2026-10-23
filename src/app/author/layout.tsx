import { AppHeader } from "@/components/AppHeader";
import { requirePortal } from "@/server/auth/requirePortal";

const NAV = [
  { href: "/author/books", label: "My books" },
  { href: "/author/tickets", label: "My queries" },
];

export default async function AuthorLayout({ children }: LayoutProps<"/author">) {
  const user = await requirePortal("AUTHOR");
  return (
    <>
      <AppHeader portal="Authors" nav={NAV} userName={user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
