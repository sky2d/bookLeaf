import type { Metadata } from "next";
import { MyBooks } from "./MyBooks";

export const metadata: Metadata = { title: "My books" };

export default function MyBooksPage() {
  return (
    <>
      <h1 className="mb-8 font-serif text-[32px] leading-tight font-semibold tracking-tight">My books</h1>
      <MyBooks />
    </>
  );
}
