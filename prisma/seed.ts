// Idempotent seed: safe to run repeatedly. Upserts the provided dataset plus demo logins.
// Run with `npm run db:seed` (uses DIRECT_URL — the pooler is not needed for a one-off script).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ADMIN_USERS,
  DEMO_ADMIN_PASSWORD,
  DEMO_AUTHOR_PASSWORD,
  mapAuthor,
  mapBook,
  type RawDataset,
} from "./seedData";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL (or DATABASE_URL) before seeding");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const dataset: RawDataset = JSON.parse(
    readFileSync(join(import.meta.dirname, "data", "bookleaf_sample_data.json"), "utf8"),
  );

  const [authorHash, adminHash] = await Promise.all([
    bcrypt.hash(DEMO_AUTHOR_PASSWORD, 10),
    bcrypt.hash(DEMO_ADMIN_PASSWORD, 10),
  ]);

  for (const raw of dataset.authors) {
    const author = mapAuthor(raw);
    await prisma.author.upsert({ where: { id: author.id }, create: author, update: author });

    for (const rawBook of raw.books) {
      const book = mapBook(rawBook, author.id);
      await prisma.book.upsert({ where: { id: book.id }, create: book, update: book });
    }

    // Login for the author. `update` deliberately leaves the password alone in case it was changed.
    await prisma.user.upsert({
      where: { email: author.email },
      create: { email: author.email, name: author.name, role: "AUTHOR", authorId: author.id, passwordHash: authorHash },
      update: { name: author.name, role: "AUTHOR", authorId: author.id },
    });
  }

  for (const admin of ADMIN_USERS) {
    await prisma.user.upsert({
      where: { email: admin.email },
      create: { ...admin, role: "ADMIN", passwordHash: adminHash },
      update: { name: admin.name, role: "ADMIN" },
    });
  }

  const [authors, books, users] = await Promise.all([prisma.author.count(), prisma.book.count(), prisma.user.count()]);
  console.log(`Seeded: ${authors} authors, ${books} books, ${users} users`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
