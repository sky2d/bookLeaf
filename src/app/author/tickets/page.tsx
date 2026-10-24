import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MyTickets } from "./MyTickets";

export const metadata: Metadata = {
  title: "My queries · BookLeaf",
};

export default function MyTicketsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight text-ink">
            My queries
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Track and manage your questions and requests with the BookLeaf team.
          </p>
        </div>

        <Link href="/author/tickets/new" className="self-start sm:self-auto">
          <Button variant="primary">+ Raise new query</Button>
        </Link>
      </div>

      <MyTickets />
    </div>
  );
}
