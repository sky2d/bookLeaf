import type { Metadata } from "next";
import { AdminTicketDetail } from "./AdminTicketDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Ticket #${id.slice(-8)} — BookLeaf Support`,
  };
}

export default async function AdminTicketPage({ params }: Props) {
  const { id } = await params;
  return <AdminTicketDetail ticketId={id} />;
}
