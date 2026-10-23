import { AppHeader } from "@/components/AppHeader";
import { requirePortal } from "@/server/auth/requirePortal";

const NAV = [{ href: "/admin/tickets", label: "Ticket queue" }];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePortal("ADMIN");
  return (
    <>
      <AppHeader portal="Support desk" nav={NAV} userName={user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
