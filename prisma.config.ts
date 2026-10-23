import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, db seed, studio) uses the DIRECT connection (port 5432).
// The app at runtime uses the pooled DATABASE_URL via the pg adapter (src/server/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
