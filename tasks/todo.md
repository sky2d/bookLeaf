# BookLeaf Portal — Task List

Stack: Next.js (App Router) · Prisma · Supabase Postgres · Auth.js v5 · Gemini · Vercel. Plan: [plan.md](plan.md).
Commands: `npm run dev`, `npm test` (Vitest), `npm run lint`, `npm run build`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run smoke:rbac`.

---

## Phase 1: Foundation

### Task 1: Next.js scaffold + API error layer + health endpoint

**Description:** `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/`). Add Vitest, zod, `server-only` and `@tanstack/react-query`. Create `src/server/http/`: `AppError` (status, code, details), and `apiHandler(fn)`, which maps `AppError`/`ZodError`/unknown errors to `{ error: { code, message, details } }`. Add `GET /api/health`, plus `.env.example` (DATABASE_URL, DIRECT_URL, AUTH_SECRET, GEMINI_API_KEY, GEMINI_MODEL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_REALTIME_KEY, APP_TODAY, AI_FORCE_FAIL) and a `.gitignore` that covers `.env*.local`. Run `git init` and make the first commit.

**Acceptance criteria:**
- [ ] `npm run dev` serves the app. `GET /api/health` → `200 { status: "ok" }`
- [ ] `AppError(404,'NOT_FOUND')` → 404 JSON. `ZodError` → 400 with field details. An unknown error → 500 with a generic message (logged server-side)
- [ ] No secrets in the repo. `.env.example` marks which variables are server-only

**Verification:**
- [ ] Tests pass: `npm test` (apiHandler mapping)
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: `curl localhost:3000/api/health`

**Dependencies:** None
**Files likely touched:** `package.json`, `src/server/http/{AppError,apiHandler}.ts`, `src/app/api/health/route.ts`, `.env.example`, `vitest.config.ts`
**Estimated scope:** Medium

---

### Task 2: Prisma schema on Supabase + deny-all RLS + seed

**Description:** Write `prisma/schema.prisma` (models + enums from plan.md, `directUrl` for migrations, indexes) and the `src/server/db.ts` singleton. Run `prisma migrate dev` against Supabase. Add a hand-edited SQL migration that runs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every table, with no policies. `prisma/seed.ts` (idempotent upserts):
- loads `prisma/data/bookleaf_sample_data.json` exactly as given into Author/Book
- creates a `User` per author (bcrypt hash, role AUTHOR, `authorId`, random `realtimeKey`)
- creates 2 ADMIN users.

**Acceptance criteria:**
- [ ] After migrate + seed: 10 authors, 18 books, 12 users. Re-running the seed doesn't create duplicates
- [ ] BK013/BK015 keep null `mrp`/`publicationDate`/`printPartner` and an empty `availableOn`. Text IDs `AUTH001`/`BK001` are kept
- [ ] `curl $SUPABASE_URL/rest/v1/books -H "apikey: $ANON"` returns no rows (RLS lockdown works)

**Verification:**
- [ ] Tests pass: `npm test` (a seed mapping unit test: JSON row → Prisma input, nulls preserved)
- [ ] Build succeeds
- [ ] Manual check: `npx prisma studio` shows the seeded data. Run the curl above

**Dependencies:** Task 1 (needs the Supabase project + connection strings from the user)
**Files likely touched:** `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`, `prisma/data/bookleaf_sample_data.json`, `src/server/db.ts`
**Estimated scope:** Medium

---

### Task 3: Login end-to-end

**Description:**
- `auth.config.ts` (edge-safe: pages, `authorized` callback, jwt/session callbacks copying `role`/`authorId`/`userId`).
- `auth.ts` (Credentials provider: zod-validate the input, look up the user via Prisma, compare with `bcryptjs`).
- `app/api/auth/[...nextauth]/route.ts`.
- `middleware.ts`: anonymous users are sent to `/login`, authors hitting `/admin/*` are redirected.
- `withAuth(handler, { roles })` for route handlers: 401 with no session, 403 for the wrong role, passes `ctx.user`.
- `GET /api/me`.
- Login page using `signIn('credentials', { redirect: false })`, then a redirect by role. Layouts with a header and a logout button.

**Acceptance criteria:**
- [ ] Valid creds → session cookie, landing on `/author/books` or `/admin/tickets` by role. Wrong password and unknown email show the same generic error
- [ ] Without a session, a protected API route → 401 JSON (not an HTML redirect). An author calling `/api/admin/*` → 403
- [ ] A refresh keeps the session. Logout clears it

**Verification:**
- [ ] Tests pass: `withAuth` unit tests (no session / wrong role / ok) with `auth()` mocked. Credentials `authorize` unit test
- [ ] Build succeeds
- [ ] Manual check: log in as `priya.sharma@email.com` and as `admin@bookleaf.com`

**Dependencies:** Task 2
**Files likely touched:** `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/http/withAuth.ts`, `src/app/api/me/route.ts`, `src/app/login/page.tsx`
**Estimated scope:** Medium

---

### ✅ Checkpoint 1: Foundation + early deploy
- [ ] `npm test`, `npm run lint` and `npm run build` are clean
- [ ] Deployed to Vercel with env vars set (`AUTH_SECRET`, pooler `DATABASE_URL`). Migrations + seed applied to Supabase
- [ ] Both roles can log in **at the live URL**
- [ ] Review with human before proceeding

---

## Phase 2: Author Portal

### Task 4: My Books page

**Description:** `GET /api/me/books` (AUTHOR) → `bookService.listForAuthor(ctx.user.authorId)`. The page shows title, ISBN, genre, publication date, status, MRP, copies sold, and royalty earned/paid/pending, plus a summary strip of totals. It handles the edge cases on purpose.

**Acceptance criteria:**
- [ ] Each author sees only their books (Sneha Kulkarni: 3, including BK013 in production). An admin calling it → 403
- [ ] In-production books show a stage badge and "—" for missing MRP/date/partner, never `null`/`NaN`. Zero pending → "₹0 · All paid up". Never paid → "No payout yet"
- [ ] Pending below ₹1,000 gets the note "Below ₹1,000 minimum — rolls over to next quarter" (BK016 ₹850). INR shown in `en-IN` format

**Verification:**
- [ ] Tests pass: `format.ts` tests (INR, nulls, dates). bookService test with a mocked repo
- [ ] Build succeeds
- [ ] Manual check: log in as Sneha Kulkarni, Kavita Deshmukh and Ananya Reddy

**Dependencies:** Task 3
**Files likely touched:** `src/app/api/me/books/route.ts`, `src/server/{services/bookService,repositories/bookRepo}.ts`, `src/app/author/books/page.tsx`, `src/lib/format.ts`, `src/components/BookCard.tsx`
**Estimated scope:** Medium

---

### Task 5: Submit a support ticket (no AI yet)

**Description:** `POST /api/tickets` (AUTHOR). Shared zod schema: `{ bookId: string | null, subject (5–150), description (20–5000), attachmentName?: string }`. The service checks the book belongs to the author and creates the ticket as OPEN with category/priority null. It also exposes an `onTicketCreated(ticket)` hook point (used by Tasks 9 and 11). Form: book dropdown (own books + "General / Account Level"), subject, description with a counter, attachment picker (UI only, filename kept), inline errors, redirect to the ticket on success.

**Acceptance criteria:**
- [ ] A valid submission → 201. Invalid input → 400 with per-field messages shown inline (the same schema runs on client and server)
- [ ] A `bookId` belonging to another author → 404
- [ ] A ticket about an in-production book works

**Verification:**
- [ ] Tests pass: ticketService.create (ok / foreign book) with a mocked repo. Schema tests
- [ ] Build succeeds
- [ ] Manual check: submit tickets both with a book and as General

**Dependencies:** Task 4
**Files likely touched:** `src/shared/schemas/ticket.ts`, `src/app/api/tickets/route.ts`, `src/server/{services/ticketService,repositories/ticketRepo}.ts`, `src/app/author/tickets/new/page.tsx`
**Estimated scope:** Medium

---

### Task 6: My Tickets list + ticket detail thread

**Description:** `GET /api/tickets` (own, newest first). `GET /api/tickets/:id` (own only) returns the original query + public messages through an **author DTO, with no notes or AI fields**. `POST /api/tickets/:id/messages` is a follow-up and reopens a RESOLVED ticket. CLOSED → 409. UI: a list with status badges (Open / In Progress / Resolved / Closed), an empty state with a "Raise your first query" CTA, and a chat-style detail view.

**Acceptance criteria:**
- [ ] Another author's ticket → 404. The list shows only own tickets
- [ ] The author DTO's exact keys are asserted in a test (no `notes`, no AI internals)
- [ ] Empty state renders. Follow-up on a CLOSED ticket → 409 with a clear message

**Verification:**
- [ ] Tests pass: DTO shape, reopen-on-reply, closed 409
- [ ] Build succeeds
- [ ] Manual check: create 2 tickets, view the list and detail, post a follow-up

**Dependencies:** Task 5
**Files likely touched:** `src/app/api/tickets/[id]/{route,messages/route}.ts`, `src/server/dto/ticketDto.ts`, `src/app/author/tickets/{page,[id]/page}.tsx`, `src/components/StatusBadge.tsx`
**Estimated scope:** Medium

---

### ✅ Checkpoint 2: Author flow
- [ ] Tests, lint and build are clean
- [ ] `npm run smoke:rbac` (2 authors + admin against a running app) passes: cross-author books/tickets/messages → 404, author → admin routes → 403
- [ ] Author logs in → books → raises a ticket → sees it listed (local + deployed)
- [ ] Review with human

---

## Phase 3: Admin Portal + real-time

### Task 7: Admin ticket queue with filters and urgency sorting

**Description:** `GET /api/admin/tickets` with zod-validated query params `status, category, priority, from, to, assignee (me|unassigned|id), q, page, pageSize`. The default view is unresolved tickets sorted by priority rank (Critical→Low; unclassified ranked as High until triaged), then oldest first. Order by a `priorityRank` Int column kept in sync by the service. UI: a filter bar (state in URL search params), a coloured priority badge, an age column (red past 48h), category or a "Needs triage" marker, assignee, author, book.

**Acceptance criteria:**
- [ ] Filters combine with AND. An invalid enum/date → 400
- [ ] Default: open/in-progress tickets, most urgent then oldest at the top. Resolved/closed tickets only appear when filtered for
- [ ] Filters survive a refresh and can be shared via the URL

**Verification:**
- [ ] Tests pass: query schema. `buildTicketWhere/orderBy` unit tests
- [ ] Build succeeds
- [ ] Manual check: tickets from 2 authors, try each filter

**Dependencies:** Task 6
**Files likely touched:** `src/app/api/admin/tickets/route.ts`, `src/shared/schemas/ticketQuery.ts`, `src/server/repositories/ticketRepo.ts`, `src/app/admin/tickets/page.tsx`, `src/components/PriorityBadge.tsx`
**Estimated scope:** Medium

---

### Task 8: Admin ticket detail: status, assign-to-me, internal notes, manual reply

**Description:**
- `GET /api/admin/tickets/:id` returns the ticket + thread + notes + context (author profile, the referenced book's full row, a summary of the author's other books).
- `PATCH /api/admin/tickets/:id` updates `status | category | priority | assigneeId`. Overrides set `*Source = MANUAL`. RESOLVED sets `resolvedAt`.
- `POST .../messages` sends a reply and moves OPEN → IN_PROGRESS automatically.
- `POST .../notes` adds an internal note.

UI: two columns (thread + reply box | context + controls), "Assign to me", and a notes panel labelled "Only visible to BookLeaf team".

**Acceptance criteria:**
- [ ] An admin reply shows up on the author's ticket view. Notes never do
- [ ] Category/priority overrides persist, shown as "Manual"
- [ ] Invalid status → 400. Unknown ticket → 404

**Verification:**
- [ ] Tests pass: PATCH schema, MANUAL source logic, auto IN_PROGRESS on first reply
- [ ] Build succeeds
- [ ] Manual check: admin assigns, notes, replies, resolves. The author sees the reply (after a refresh at this stage)

**Dependencies:** Task 7
**Files likely touched:** `src/app/api/admin/tickets/[id]/{route,messages/route,notes/route}.ts`, `src/server/services/ticketService.ts`, `src/app/admin/tickets/[id]/page.tsx`, `src/components/{ReplyBox,InternalNotes,AuthorContextPanel}.tsx`
**Estimated scope:** Medium–Large (split the context panel out if it runs long)

---

### Task 9: Real-time updates via Supabase Realtime Broadcast

**Description:** `src/server/realtime/broadcast.ts` sends `{ type, ticketId }` to the author's channel (`u:<realtimeKey>`) and the admin channel (`a:<ADMIN_REALTIME_KEY>`) through Supabase's HTTP broadcast endpoint (service-role key, server only). Call it from ticketService after create / message / status or triage changes. Broadcast failures are logged and never fail the request. Client: a `useLiveTickets` hook (Supabase browser client with the anon key) subscribes to the channel key from `/api/me` and invalidates the TanStack Query keys `['tickets']` and `['ticket', id]`. Add a "Live" indicator. Fallback is `refetchInterval: 30s` + refetch on focus.

**Acceptance criteria:**
- [ ] With an author tab and an admin tab open, an admin reply/status change appears for the author **without a refresh** within ~2s
- [ ] New tickets (and their later AI triage) appear in the admin queue without a refresh
- [ ] Broadcast payloads contain no ticket content. If Realtime is down, pages still update via polling

**Verification:**
- [ ] Tests pass: event → query-key mapping. broadcast swallows errors
- [ ] Build succeeds
- [ ] Manual check: two browsers side by side **on the deployed URL**

**Dependencies:** Task 8
**Files likely touched:** `src/server/realtime/broadcast.ts`, `src/server/services/ticketService.ts`, `src/lib/supabaseBrowser.ts`, `src/hooks/useLiveTickets.ts`, `src/components/LiveIndicator.tsx`
**Estimated scope:** Medium

---

### ✅ Checkpoint 3: Manual ticket lifecycle
- [ ] Tests, lint, build and `smoke:rbac` are clean. Deployed
- [ ] Author creates → live in the admin queue → admin assigns, notes, replies → author sees it live → resolved
- [ ] Everything works with **no Gemini key** (the degraded-mode baseline)
- [ ] Review with human

---

## Phase 4: AI Integration (Gemini)

> Before starting, confirm the current Gemini Flash model ID, `@google/genai` structured-output syntax (`responseSchema`), `usageMetadata` fields and pricing from the official docs.

### Task 10: AI module foundation

**Description:** `src/server/ai/` (all `server-only`):
- `client.ts` wraps `@google/genai`: env key/model, a timeout, retry with backoff only on 429/5xx/timeout, a typed `AiUnavailableError`, and `isAiEnabled()`.
- `knowledgeBase.ts` holds the KB as structured sections (overview, royalty, isbn, printing, distribution, production, tone + sample Q→A per category), with `getContextFor(category)`.
- `facts.ts` has pure functions: `nextPayoutDate(today)`, `belowThreshold(pending)`, `productionStage(status)`.
- `usage.ts` logs to `AiCall`.

**Acceptance criteria:**
- [ ] The key is only read in `ai/client.ts`. After the build, `grep -r GEMINI .next/static` finds nothing
- [ ] `nextPayoutDate` is correct at quarter boundaries. `getContextFor` returns tone + one section, never the whole KB
- [ ] 429/500/timeout → retries then `AiUnavailableError`. A 400 → no retry. Every attempt is logged

**Verification:**
- [ ] Tests pass: facts, knowledgeBase, client retry behaviour (SDK mocked)
- [ ] Build succeeds + the bundle grep
- [ ] Manual check: `npm run ai:ping` (one tiny real call, prints token usage)

**Dependencies:** Task 1 (can run in parallel with Phases 2–3)
**Files likely touched:** `src/server/ai/{client,knowledgeBase,facts,usage}.ts`, `src/server/ai/__tests__/*`, `scripts/aiPing.ts`
**Estimated scope:** Medium

---

### Task 11: Auto-classification + priority, with fallback and admin override

**Description:** `ai/classifier.ts` makes one Gemini call with `responseMimeType: 'application/json'` + a `responseSchema` (category enum ×6, priority enum ×4, confidence, reasoning ≤1 sentence), `temperature: 0`, and small `maxOutputTokens`. The prompt has category definitions, a priority rubric with examples, and the book's status/pending facts. It does **not** include KB policy text. The result is validated with zod. On any failure, `heuristicClassifier.ts` (keyword rules) sets `source = FALLBACK`. `onTicketCreated` runs this in `after()`, then updates the ticket and broadcasts. Add `POST /api/admin/tickets/:id/classify` to re-run it. UI: an AI/Fallback/Manual source chip, a reasoning tooltip, and override dropdowns (PATCH from Task 8).

**Acceptance criteria:**
- [ ] The 201 doesn't wait for Gemini. The queue fills in triage live a moment later
- [ ] "No royalty for 6 months" → Royalty & Payments, High/Critical. "Update my author bio?" → General Inquiry, Low. An ISBN mismatch → ISBN & Metadata, High
- [ ] With the key unset or `AI_FORCE_FAIL=true`: FALLBACK triage is applied and no errors reach the user

**Verification:**
- [ ] Tests pass: classifier with a mocked SDK (valid / malformed → fallback / error → fallback). Heuristic tests
- [ ] Build succeeds
- [ ] Manual check: real-key tickets show up in the queue. Repeat with `AI_FORCE_FAIL=true`

**Dependencies:** Tasks 9, 10
**Files likely touched:** `src/server/ai/{classifier,heuristicClassifier,prompts/classify}.ts`, `src/server/services/ticketService.ts`, `src/app/api/admin/tickets/[id]/classify/route.ts`, `src/components/{TriageControls,SourceChip}.tsx`
**Estimated scope:** Medium

---

### Task 12: AI-drafted responses with targeted context, caching, edit and send

**Description:** `ai/contextBuilder.ts` + `ai/drafter.ts` build the prompt:
- `systemInstruction`: BookLeaf Author Support persona + tone guidelines + hard rules (only the provided policies/facts, no invented numbers, policy timelines, acknowledge first, clear next step, sign off as "Team BookLeaf Author Support").
- The one matching KB section.
- Computed facts for the referenced book only.
- The last 6 messages.

`GET /api/admin/tickets/:id/draft` returns the cached `AiDraft` or generates one. `?regenerate=true` forces a new one. The cache is invalidated when the message count changes. Set `maxDuration` on the route. UI: the reply box is pre-filled with "AI draft — review before sending", with a skeleton while loading and Regenerate. On failure it shows a banner "AI draft unavailable — please write a reply manually" + Retry. Sending sets `usedAiDraft`.

**Acceptance criteria:**
- [ ] Opening a ticket twice makes **one** Gemini call (check the `AiCall` rows)
- [ ] A royalty draft for Ananya Reddy / BK005 (never paid, ₹2,546 pending) states the real amount and the computed next payout date, and acknowledges the concern first. An ISBN draft commits to 48h escalation. A print-quality draft asks for photos and gives the 5–7 day reprint timeline
- [ ] AI failure → 503 `AI_UNAVAILABLE`. The UI shows the manual fallback and the admin can still send

**Verification:**
- [ ] Tests pass: context builder snapshot (one KB section, one book, ≤6 messages). Cache hit/miss. Failure path
- [ ] Build succeeds
- [ ] Manual check: 3 categories, edit + send, and the reply appears live for the author

**Dependencies:** Tasks 10, 11
**Files likely touched:** `src/server/ai/{contextBuilder,drafter,prompts/draft}.ts`, `src/app/api/admin/tickets/[id]/draft/route.ts`, `src/components/{ReplyBox,AiDraftBanner}.tsx`
**Estimated scope:** Medium–Large

---

### Task 13: Prompt evaluation + tuning

**Description:** `scripts/evalPrompts.ts` runs the 7 KB sample queries plus ~8 extra cases (Hinglish, vague, multi-issue, angry, in-production books BK013/BK015, below-threshold BK016) against seeded authors. It prints expected vs actual triage and the average tokens per call, and writes the drafts to `eval/results.md`. Iterate on the prompts.

**Acceptance criteria:**
- [ ] One command produces an accuracy table + token averages
- [ ] Category accuracy ≥ 13/15. Sample-table drafts hit the spec's "Expected Response" points
- [ ] Results and token stats are copied into the README's AI section

**Verification:**
- [ ] Manual check: read `eval/results.md` and spot-check 3 drafts against the tone guidelines

**Dependencies:** Task 12
**Files likely touched:** `scripts/evalPrompts.ts`, `scripts/evalCases.json`, `eval/results.md`, prompt files
**Estimated scope:** Small–Medium

---

### ✅ Checkpoint 4: AI complete
- [ ] Tests, lint and build are clean. Deployed with `GEMINI_API_KEY` in Vercel env
- [ ] With the key: live triage + drafts work on the deployed URL
- [ ] With `AI_FORCE_FAIL=true`: ticket creation, fallback triage and manual replies all work
- [ ] Review with human

---

## Phase 5: Documentation & Ship

### Task 14: OpenAPI spec + `/api-docs`

**Description:** An OpenAPI 3 spec generated from the zod schemas (`@asteasolutions/zod-to-openapi`) or a hand-written `openapi.yaml`. It covers every route, auth (Auth.js session cookie; explain how the login flow works), the role per endpoint, and error codes. Serve it at `GET /api/openapi` and render it with Swagger UI at `/api-docs`.

**Acceptance criteria:**
- [ ] Every `src/app/api/**/route.ts` (except the Auth.js catch-all, which is documented separately) is in the spec. A parity test enforces this
- [ ] Each endpoint lists its role and error responses
- [ ] `/api-docs` loads on the deployed URL

**Verification:**
- [ ] Tests pass: parity test
- [ ] Manual check: open `/api-docs`

**Dependencies:** Tasks 1–12
**Files likely touched:** `src/server/openapi.ts`, `src/app/api/openapi/route.ts`, `src/app/api-docs/page.tsx`, `src/server/__tests__/openapiParity.test.ts`
**Estimated scope:** Small–Medium

---

### Task 15: README, write-up, final deploy, demo credentials

**Description:**
- **README:**
  - Overview, live URL, and a **credentials table** (10 authors + 2 admins).
  - Local setup: Supabase project → env → `prisma migrate deploy` → `prisma db seed` → `npm run dev`.
  - Architecture diagram + decisions: Prisma over Supabase, deny-all RLS, Auth.js, Broadcast as an invalidation signal, `after()`.
  - AI section: prompts, context selection, caching, fallback, why Gemini Flash, eval + token stats.
  - API docs link + endpoint table.
  - Known limitations: UI-only attachments, `after()` vs a durable queue, no email notifications, free-tier pausing/rate limits.
- **`WRITEUP.md`** (≤1 page): priorities, trade-offs, path to production.
- Final deploy from a clean seed.

**Acceptance criteria:**
- [ ] A fresh clone → working local app by following the README alone
- [ ] The live URL is seeded with the exact dataset. Every credential listed works
- [ ] The write-up fits on one page

**Verification:**
- [ ] Manual check: fresh clone into a temp dir and follow the README. Run the full lifecycle on the live URL as 2 authors + 1 admin

**Dependencies:** All
**Files likely touched:** `README.md`, `WRITEUP.md`, `docs/architecture.md` (mermaid)
**Estimated scope:** Small

---

### ✅ Checkpoint 5: Submission ready
- [ ] Every task's acceptance criteria are checked
- [ ] Repo public, commits clean, no secrets in history (`git log -p | grep -iE "AIza|service_role|postgres://"` is empty)
- [ ] Live demo verified end-to-end. Supabase project active
- [ ] Final human review

---

## Optional (only if time remains, in this order)
- [ ] Real attachment upload to Supabase Storage (private bucket, size/type limits, signed URLs for admins)
- [ ] Admin stats strip: open count by priority, oldest unresolved age, AI override rate
- [ ] Author can close a resolved ticket / rate the response

## Parallelization notes
- Task 10 only depends on Task 1, so it can run alongside Phases 2–3.
- Task 14 can be drafted during Phase 4 once the route signatures are stable.
- Everything else is sequential (shared schema and ticket service).
