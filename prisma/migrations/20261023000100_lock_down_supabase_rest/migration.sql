-- Supabase auto-exposes every table in the `public` schema through its REST/GraphQL API
-- to anyone holding the anon key — and the anon key is shipped to the browser for Realtime.
-- This app never uses that API: all data access goes through Prisma, which connects as the
-- `postgres` role and bypasses RLS. So we enable RLS with NO policies (deny-all for API roles)
-- and revoke API-role privileges outright.

ALTER TABLE "users"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authors"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "books"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "internal_notes"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_drafts"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_calls"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- The anon/authenticated roles only exist on Supabase; skip quietly on plain Postgres (local/CI).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
  END IF;
END
$$;
