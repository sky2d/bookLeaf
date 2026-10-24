import type { Metadata } from "next";
import Link from "next/link";
import { TicketThread } from "./TicketThread";

export const metadata: Metadata = {
  title: "Ticket Details · BookLeaf",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage(props: Props) {
  const { id } = await props.params;

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-ink-soft">
        <Link href="/author/tickets" className="hover:text-ink underline-offset-4 hover:underline">
          ← Back to My queries
        </Link>
      </nav>

      <TicketThread ticketId={id} />
    </div>
  );
}
