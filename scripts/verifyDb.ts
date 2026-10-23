// Sanity-checks a migrated + seeded database. Run: `npm run db:verify`
// Also probes Supabase's auto REST API with the public anon key to prove tables are locked down.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const [authors, books, users, admins] = await Promise.all([
    prisma.author.count(),
    prisma.book.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);
  check("10 authors", authors === 10, String(authors));
  check("18 books", books === 18, String(books));
  check("12 users (10 authors + 2 admins)", users === 12 && admins === 2, `${users} users, ${admins} admins`);

  const bk013 = await prisma.book.findUnique({ where: { id: "BK013" } });
  check(
    "BK013 (in production) keeps nulls",
    !!bk013 && bk013.mrp === null && bk013.publicationDate === null && bk013.availableOn.length === 0,
  );

  const rls = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'`;
  const open = rls.filter((t) => !t.relrowsecurity).map((t) => t.relname);
  check("RLS enabled on every public table", open.length === 0, open.length ? `missing: ${open.join(", ")}` : `${rls.length} tables`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && !url.includes("<project-ref>")) {
    const res = await fetch(`${url}/rest/v1/books?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    const rows = res.ok ? ((await res.json()) as unknown[]) : [];
    check("Supabase REST API with anon key returns no rows", rows.length === 0, `HTTP ${res.status}, ${rows.length} rows`);
  } else {
    console.log("– Skipped Supabase REST probe (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set)");
  }
}

main()
  .catch((err) => {
    console.error(err);
    failures++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exitCode = failures ? 1 : 0;
  });
