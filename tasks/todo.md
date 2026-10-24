# BookLeaf Portal — Task List

Stack: Next.js (App Router) · Prisma · Supabase Postgres · Auth.js v5 · Gemini · Vercel. Plan: [plan.md](plan.md).
Commands: `npm run dev`, `npm test` (Vitest), `npm run lint`, `npm run build`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run smoke:rbac`.

## Status (checked 2026-10-24)

| # | Task | State |
|---|---|---|
| 1 | Scaffold + API error layer + health | ✅ Done (`a88c74a`) |
| 2 | Prisma schema + deny-all RLS + seed | ✅ Done. Applied to Supabase 2026-10-24, `db:verify` all ✔ |
| 3 | Login end-to-end | ✅ Done. Verified live 2026-10-24 |
| 4 | My Books page | ✅ Done on `feat/my-books` (waiting on the PR merge). A visual check in the browser is still open |
| 4a | `smoke:rbac` script (new: Checkpoint 2 needed it, but no task created it) | ✅ Done on `feat/rbac-smoke` (waiting on the PR merge). 8/8 checks pass |
| 4b | Vercel deploy | ⏸ **Deferred** (your call, 2026-10-24): build everything locally first, deploy once before Task 15. Leave ~½ day for deploy issues |
| CP1 | Foundation + My Books | ✅ Tests, lint, build and `smoke:rbac` clean locally (the deploy items move to before Task 15) |
| 5 | Submit ticket | ✅ Done (`cae979b`) |
| 6a | Ticket detail thread + author follow-up | ✅ Done (`9408fd8`) |
| 6b | Ticket list | ✅ Done on `feat/ticket-list`. 74 tests pass, 22/22 smoke pass |
| 7 | Admin ticket queue with filters and urgency sorting | ✅ Done on `feat/admin-queue`. 95 tests pass, 25/25 smoke pass |
| 8 | Admin ticket detail: status, assign-to-me, internal notes, manual reply | ✅ Done on `feat/admin-ticket-detail`. 113 tests pass, 31/31 smoke pass |
| 9 | Real-time updates via Supabase Realtime Broadcast | ✅ Done on `feat/realtime-broadcast`. 123 tests pass, 31/31 smoke pass |
| 10–15 | AI foundation, triage, drafts, eval, docs | ⬜ Next up (`@google/genai` is installed, but there's no `src/server/ai/` yet) |

Evidence: `npm test` 123/123 pass (15 files) · `npm run typecheck` clean · `npm run build` ok · `npm run lint` clean (0 errors, 0 warnings) · `npm run smoke:rbac` 31/31 pass · live: `GET /api/health` → 200, `/api/me`, `/api/me/books`, `/api/tickets` without a session → 401 JSON, `/author/books` → 307 `/login?next=…`, `/api/admin/tickets` & `/api/admin/tickets/:id/*` author → 403 / admin → 200/201 · secret scan of git history: 0 hits.

Empty in `.env`: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS probe, Realtime), `SUPABASE_SERVICE_ROLE_KEY` (Task 9), `GEMINI_API_KEY` (Task 10+).

**Next, in order** (each step leaves the app working; details under each task's "To finish"):
1. ~~**Task 2:** apply migrations + seed~~ ✅
2. ~~**Task 3:** live login check~~ ✅
3. ~~**Task 4:** fix lint, add the `bookService` test, commit~~ ✅ (open the page in a browser to check the visuals)
4. ~~**Task 4a:** `smoke:rbac` v1~~ ✅
5. ~~**Task 4b:** deploy~~ ⏸ deferred to before Task 15
6. **Task 5 → 6a → 6b**, then **Checkpoint 2** (all local)

---

## Phase 1: Foundation

### Task 1: Next.js scaffold + API error layer + health endpoint

**Description:** `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/`). Add Vitest, zod, `server-only` and `@tanstack/react-query`. Create `src/server/http/`: `AppError` (status, code, details), and `apiHandler(fn)`, which maps `AppError`/`ZodError`/unknown errors to `{ error: { code, message, details } }`. Add `GET /api/health`, plus `.env.example` (DATABASE_URL, DIRECT_URL, AUTH_SECRET, GEMINI_API_KEY, GEMINI_MODEL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_REALTIME_KEY, APP_TODAY, AI_FORCE_FAIL) and a `.gitignore` that covers `.env*.local`. Run `git init` and make the first commit.

**Status:** ✅ Done (`a88c74a`)

**Acceptance criteria:**
- [x] `npm run dev` serves the app. `GET /api/health` → `200 { status: "ok" }`
- [x] `AppError(404,'NOT_FOUND')` → 404 JSON. `ZodError` → 400 with field details. An unknown error → 500 with a generic message (logged server-side)
- [x] No secrets in the repo. `.env.example` marks which variables are server-only

**Verification:**
- [x] Tests pass: `npm test` (apiHandler mapping)
- [x] Build succeeds: `npm run build`
- [x] Manual check: `curl localhost:3000/api/health`

**Dependencies:** None
**Files likely touched:** `package.json`, `src/server/http/{AppError,apiHandler}.ts`, `src/app/api/health/route.ts`, `.env.example`, `vitest.config.ts`
**Estimated scope:** Medium

---

### Task 2: Prisma schema on Supabase + deny-all RLS + seed

**Description:** Write `prisma/schema.prisma` (models + enums from plan.md, `directUrl` for migrations, indexes) and the `src/server/db.ts` singleton. Run `prisma migrate dev` against Supabase. Add a hand-edited SQL migration that runs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every table, with no policies. `prisma/seed.ts` (idempotent upserts):
- loads `prisma/data/bookleaf_sample_data.json` exactly as given into Author/Book
- creates a `User` per author (bcrypt hash, role AUTHOR, `authorId`, random `realtimeKey`)
- creates 2 ADMIN users.

**Status:** ✅ Done. Migrations + seed applied 2026-10-24. `db:verify`: 10/18/12, BK013 nulls kept, RLS on all 9 tables, the anon REST probe returns HTTP 401 with 0 rows. A second seed run left the counts unchanged.

**To finish:**
1. Put `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env` (Supabase → Project Settings → API) so `db:verify` can run the REST probe
2. `npm run db:deploy && npm run db:seed && npm run db:verify` (runs against `DIRECT_URL`)
3. Run `npm run db:seed && npm run db:verify` a second time: the counts must not change (proves the seed is idempotent)

**Acceptance criteria:**
- [x] After migrate + seed: 10 authors, 18 books, 12 users. Re-running the seed doesn't create duplicates
- [x] BK013/BK015 keep null `mrp`/`publicationDate`/`printPartner` and an empty `availableOn`. Text IDs `AUTH001`/`BK001` are kept
- [x] `curl $SUPABASE_URL/rest/v1/books -H "apikey: $ANON"` returns no rows (RLS lockdown works)

**Verification:**
- [x] Tests pass: `npm test` (a seed mapping unit test: JSON row → Prisma input, nulls preserved)
- [x] Build succeeds
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

**Status:** ✅ Done. Verified 2026-10-24 over HTTP against `npm run dev`: Priya → `/author/books` with only BK001/BK002, admin → `/admin/tickets`, admin `/api/me/books` → 403, a wrong password and an unknown email both give no session, sign-out clears the session. Note: Next 16 renamed middleware, so it lives in `src/proxy.ts`.

**To finish** (needs Task 2 applied; `npm run dev`):
1. Log in as `priya.sharma@email.com` / `Author@123` → `/author/books`, and as `admin@bookleaf.com` / `Admin@123` → `/admin/tickets`
2. A wrong password and an unknown email show the same message. A refresh keeps the session. Sign out → `/login`, and `/author/books` then redirects back to `/login`
3. Testing a production build locally (`npm start`) needs `AUTH_TRUST_HOST=true`. Auth.js only trusts the host automatically on Vercel or in dev

**Acceptance criteria:**
- [x] Valid creds → session cookie, landing on `/author/books` or `/admin/tickets` by role. Wrong password and unknown email show the same generic error
- [x] Without a session, a protected API route → 401 JSON (not an HTML redirect). An author calling `/api/admin/*` → 403 *(no `/api/admin/*` routes exist yet; the role 403 was verified via admin → `/api/me/books`)*
- [x] A refresh keeps the session. Logout clears it

**Verification:**
- [x] Tests pass: `withAuth` unit tests (no session / wrong role / ok) with `auth()` mocked. Credentials `authorize` unit test
- [x] Build succeeds
- [x] Manual check: log in as `priya.sharma@email.com` and as `admin@bookleaf.com`

**Dependencies:** Task 2
**Files likely touched:** `src/auth.ts`, `src/proxy.ts`, `src/server/auth/*`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/http/withAuth.ts`, `src/app/api/me/route.ts`, `src/app/login/page.tsx`
**Estimated scope:** Medium

---

> Checkpoint 1 now sits after Task 4b (Task 4 was started before it).

---

## Phase 2: Author Portal

### Task 4: My Books page

**Description:** `GET /api/me/books` (AUTHOR) → `bookService.listForAuthor(ctx.user.authorId)`. The page shows title, ISBN, genre, publication date, status, MRP, copies sold, and royalty earned/paid/pending, plus a summary strip of totals. It handles the edge cases on purpose.

**Status:** ✅ Done on branch `feat/my-books`. Verified 2026-10-24: 48 tests pass, lint has 0 problems, typecheck clean. Live API data matches every edge case (Sneha 3 books incl. BK013, Kavita ₹850 `belowThreshold`, Ananya BK005 never paid ₹2,546, admin → 403). Still open: a visual check in the browser. Previously: Built so far: `GET /api/me/books` (AUTHOR-only), `bookService` + `bookRepo` (scoped by `authorId`), `src/shared/{dto,royalty,production}.ts`, `src/server/clock.ts` (`APP_TODAY`), `src/lib/{format,apiClient}.ts`, the page + `components/books/*` (shelf, royalty summary, production progress, per-book details) and `components/ui/States.tsx`. Left: 2 lint errors in `RoyaltySummary.tsx`, the `bookService` test, the manual check, the commit.

**Acceptance criteria:**
- [x] Each author sees only their books (Sneha Kulkarni: 3, including BK013 in production). An admin calling it → 403 *(verified via the live API)*
- [ ] In-production books show a stage badge and "—" for missing MRP/date/partner, never `null`/`NaN`. Zero pending → "₹0 · All paid up". Never paid → "No payout yet" *(implemented; "₹0" and "All paid up" render as separate lines, not one string)*
- [ ] Pending below ₹1,000 gets the note "Below ₹1,000 minimum — rolls over to next quarter" (BK016 ₹850). INR shown in `en-IN` format *(implemented on the account-level total in `RoyaltySummary`, which matches the policy; Kavita's total is ₹850. Wording differs from the spec)*

**Verification:**
- [x] Tests pass: `format.ts` tests (INR, nulls, dates). bookService test with a mocked repo (`src/server/services/bookService.test.ts`)
- [x] Build succeeds
- [ ] Manual check: log in as Sneha Kulkarni, Kavita Deshmukh and Ananya Reddy *(data verified via the API; visual check in the browser still open)*

**To finish:**
1. Lint to 0 problems with no `eslint-disable`: escape the `'` at `RoyaltySummary.tsx:42,54`. In `apiClient.ts:32`, build the login redirect as an absolute URL (`new URL("/login", window.location.origin)`); the rule only flags relative destinations
2. Add `src/server/services/bookService.test.ts` (mock `bookRepo` and `@/server/clock`):
   - `listForAuthor` queries with the given authorId
   - `toBookDto` keeps BK013's nulls and parses its stage (Cover Design, index 2)
   - `summarise` gives the right totals, `belowThreshold` for Kavita's ₹850, and `nextPayout` for a pinned date
3. Manual check (seeded DB):
   - Sneha: 3 books, BK013 shows the stage strip and "—" for missing values
   - Kavita: BK015 in Typesetting, and the ₹850 below-minimum note
   - Ananya: BK005 "No payout yet", ₹2,546 pending, next payout date shown
   - An admin calling `GET /api/me/books` → 403
4. Commit: `feat(author): My Books page with royalty summary`

**Dependencies:** Task 3
**Files likely touched:** `src/app/api/me/books/route.ts`, `src/server/{services/bookService,repositories/bookRepo}.ts`, `src/app/author/books/page.tsx`, `src/lib/format.ts`, `src/components/books/*`
**Estimated scope:** Medium

---

### Task 4a: RBAC smoke script (`npm run smoke:rbac`)

**Description:** `scripts/smokeRbac.ts` logs in over HTTP the way a browser does: `GET /api/auth/csrf` → `POST /api/auth/callback/credentials` (form-encoded, `redirect: "manual"`), keeping the session cookie. It then runs a **table of cases** (persona × method × path → expected status, plus an optional body assertion) against `BASE_URL` (default `http://localhost:3000`), prints a ✔/✘ line per case and exits non-zero on any failure. v1 covers the routes that exist today. Tasks 5–8 each add rows for their new routes.

**Status:** ✅ Done. Verified 2026-10-24: 8/8 checks pass against `npm run dev`. A broken case → ✘ and exit 1. An unreachable app → a clear error and exit 1. Lint, typecheck and the 48 tests pass.

**Acceptance criteria:**
- [x] Anonymous → `/api/me`, `/api/me/books` → 401 JSON
- [x] Priya (AUTH001) sees exactly BK001 + BK002. Sneha (AUTH007) sees exactly BK011–BK013. Admin → `/api/me/books` → 403
- [x] A wrong password yields no session cookie, so the next call is 401. The script fails loudly (non-zero exit) if the app isn't reachable

**Verification:**
- [x] `npm run dev` + `npm run smoke:rbac` → all ✔, exit 0
- [x] Break a case on purpose (e.g. expect 200 for admin) → ✘ and exit 1, then revert
- [x] `npm run lint` and `npm run typecheck` clean

**Dependencies:** Tasks 2 (seeded users), 4 (`/api/me/books`)
**Files likely touched:** `scripts/smokeRbac.ts`, `package.json`
**Estimated scope:** Small

---

### Task 4b: Deploy to Vercel (⏸ deferred: run it before Task 15)

**Status:** ⏸ Deferred 2026-10-24. Everything is developed and checked locally first. Meanwhile every task keeps `.env.example` in sync and the build green, so this stays a short task. Do it right after Checkpoint 4, before Task 14/15. The GitHub remote already exists.

**Description:** Get the app live early so environment/cookie/pooler surprises surface now, not on day 4. Human steps first:
1. Create a GitHub repo and push `main` (there's no remote yet)
2. Import the repo in Vercel and set the env vars: `DATABASE_URL` (pooler, port 6543), `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_REALTIME_KEY`, `GEMINI_MODEL`, `AI_FORCE_FAIL`

`DIRECT_URL` isn't needed on Vercel, because migrations run from your machine. Never paste secrets into chat.

Agent steps: document `AUTH_TRUST_HOST` (local `npm start` only) in `.env.example`. Then confirm that the build only runs `prisma generate`, not migrations.

**Acceptance criteria:**
- [ ] The live `GET /api/health` → 200 with `database: "up"`
- [ ] Both roles log in on the live URL and land on their portal. A refresh keeps the session
- [ ] `BASE_URL=<live url> npm run smoke:rbac` passes

**Verification:**
- [ ] Vercel build log is green, with no secret values in it
- [ ] Manual check: open the live URL in a private window and walk through both logins

**Dependencies:** Tasks 2, 3, 4, 4a
**Files likely touched:** `.env.example`, `README.md` (live URL placeholder)
**Estimated scope:** Small (mostly human setup)

---

### ✅ Checkpoint 1: Foundation + My Books + early deploy
- [x] `npm test`, `npm run lint` and `npm run build` are clean
- [x] Migrations + seed applied to Supabase
- [x] Both roles can log in locally, and `smoke:rbac` passes (8/8)
- ⏸ Deployed to Vercel + live login: deferred to Task 4b, before Task 15
- [ ] Review with human before proceeding

---

### Task 5: Submit a support ticket (no AI yet)

**Description:** `POST /api/tickets` (AUTHOR). Shared zod schema: `{ bookId: string | null, subject (5–150), description (20–5000), attachmentName?: string }`. The service checks the book belongs to the author and creates the ticket as OPEN with category/priority null. (Tasks 9 and 11 add their post-create work inside `ticketService.create`; no stub hook now.) Form: book dropdown (own books + "General / Account Level"), subject, description with a counter, attachment picker (UI only, filename kept), inline errors, redirect to the ticket on success.

**Builds on what exists:**
- Server: `bookRepo.findOwned(authorId, bookId)` (the ownership check), `parseBody`, `withAuth` + `requireAuthorId`
- Client: `api()` + `ApiError.fieldErrors()` (inline errors), `Field`/`Input`/`Textarea`/`Select`, and the `myBooksQuery` key for the dropdown
- Conventions: DTO types go in `src/shared/dto.ts`. Mappers sit next to their service, as `toBookDto` does
- Pre-select the book from `?book=BK…`. `BookDetails`' "Ask about this book" link already sends it
- The "My queries" nav link 404s until Task 6b. The success redirect 404s until 6a

#### Implementation plan

Branch `feat/submit-ticket`, built in **two increments**, each verified and committed on its own (`feat: …`). The API comes first, so the form is built against a contract that already works.

**API contract**

```
POST /api/tickets                       AUTHOR only
body  { bookId: string | null, subject: string, description: string, attachmentName?: string | null }
201   { ticket: TicketSummaryDto }      + Location: /api/tickets/<id>
400   VALIDATION_ERROR  details: [{ path: "subject", message: "…" }, …]
400   INVALID_JSON
401   UNAUTHORIZED      (no session)
403   FORBIDDEN         (admin)
404   NOT_FOUND         "Book not found."  (another author's book, or no such book: indistinguishable on purpose)
```

`TicketSummaryDto = { id, subject, status, book: { id, title } | null, createdAt, updatedAt }`, in `src/shared/dto.ts`. Task 6b's list reuses it, and Task 6a's detail DTO extends it.

**Decisions**
- **Validation (`createTicketSchema`, shared by client and server):**
  - `subject` and `description` are trimmed before length checks (5–150 / 20–5000). That way "     " can't satisfy the minimum
  - `bookId` is `string | null`; the form's "General / Account level" option sends `null`
  - `attachmentName` is trimmed and reduced to its basename. Browsers report `C:\fakepath\x.pdf`, and `x.pdf` is stored. It allows ≤255 characters, and empty becomes `null`
- **Ownership:** the service calls `bookRepo.findOwned(authorId, bookId)`. `authorId` always comes from the session, never the body. A miss → `AppError.notFound("Book")`, and no ticket is created
- **Defaults:** `status` OPEN, `category`/`priority` null, `priorityRank` 1 (schema defaults). The ticket shows as "Needs triage" once the queue exists
- **No `onTicketCreated` stub yet.** A no-op hook would be dead code. Tasks 9 and 11 add the call inside `ticketService.create` when they need it. The description above is changed accordingly
- **Form behaviour:**
  - Validate on submit with the same schema and show per-field messages
  - Server field errors arrive via `ApiError.fieldErrors()`, and a 404 maps onto the book field
  - Any other error shows one banner, and the typed text is kept
  - The button is disabled while sending. On success: invalidate `["tickets"]`, then `router.push("/author/tickets/<id>")`
- **Pre-selection:** `?book=BK…` is read in the server page (`await props.searchParams`) and pre-selects that book only if it's one of the author's own. Otherwise the default is "General"
- **Attachment:** a native file input, with only `file.name` kept. Hint: "Only the file name is sent for now. Our team will ask for the file if they need it."

**Increment A: API slice**
1. `src/shared/schemas/ticket.ts` + `ticket.test.ts`: boundaries (4/5/150/151 characters, 19/20 characters), whitespace-only rejected, `null` bookId accepted, fakepath stripped
2. `src/shared/dto.ts`: add `TicketSummaryDto`
3. `src/server/repositories/ticketRepo.ts`: `create(data)`, returning the ticket with `book { id, title }`
4. `src/server/services/ticketService.ts` + `ticketService.test.ts` (mock both repos):
   - creates with a book, and as General
   - a foreign book → 404 and `create` is never called
   - an in-production book (BK013) works
   - `authorId` comes from the argument, not the input
5. `src/app/api/tickets/route.ts`: `POST = withAuth(…, { roles: ["AUTHOR"] })` → `parseBody` → service → `Response.json(…, { status: 201, headers: { Location } })`
6. `scripts/smokeRbac.ts`: add rows (light). Anonymous POST → 401, admin POST → 403, Priya POSTing Sneha's `BK011` → 404, Priya with an empty body → 400 `VALIDATION_ERROR`. There's no success row, because every run would create a real ticket
7. Verify: `npm test`, `npm run lint`, `npm run typecheck`, `npm run smoke:rbac` on `npm run dev`, plus one real `201` via curl. Commit `feat: create support tickets via POST /api/tickets`

**Increment B: form**
1. `src/app/author/tickets/new/page.tsx` (server): metadata, heading, reads `?book`, renders the form
2. `src/app/author/tickets/new/NewTicketForm.tsx` (client):
   - fields: book `Select` from `myBooksQuery` (in-production books labelled with their stage), subject, description, attachment
   - description has a live `n / 5000` counter, with the "at least 20 characters" hint until met
   - loading/error states use `LoadingBlock`/`ErrorBlock`
3. Verify (`npm run dev`), then commit `feat: support ticket form for authors`:
   - "Ask about this book" on BK013 pre-selects it
   - an empty submit shows 3 inline errors and makes no request
   - a valid General ticket and a book ticket each → 201, then the redirect (to a 404 until 6a)
   - keyboard-only: label clicks focus fields, and errors are announced

**Risks**

| Risk | Mitigation |
|---|---|
| The redirect target 404s until Task 6a | Expected; do 6a next. Rows are confirmed via `db:studio` meanwhile |
| A Zod 4 issue `path` for nested/optional fields | Tested in the schema test, so `fieldErrors()` keys match the field ids |
| Smoke runs filling the DB with test tickets | No success rows in the smoke table. The manual tickets are few and harmless |

**Status:** ✅ Done on branch `feat/submit-ticket`. Verified: 62 tests pass, lint clean, typecheck clean, 12/12 smoke checks pass.

**Acceptance criteria:**
- [x] A valid submission → 201. Invalid input → 400 with per-field messages shown inline (the same schema runs on client and server)
- [x] A `bookId` belonging to another author → 404
- [x] A ticket about an in-production book works

**Verification:**
- [x] Tests pass: ticketService.create (ok / foreign book) with a mocked repo. Schema tests
- [x] Build succeeds
- [x] `smoke:rbac` gets new rows: an author posting another author's `bookId` → 404, anonymous `POST /api/tickets` → 401
- [x] Manual check: submit tickets both with a book and as General

**Dependencies:** Task 4
**Files likely touched:** A: `src/shared/schemas/ticket{,.test}.ts`, `src/shared/dto.ts`, `src/server/repositories/ticketRepo.ts`, `src/server/services/ticketService{,.test}.ts`, `src/app/api/tickets/route.ts`, `scripts/smokeRbac.ts` · B: `src/app/author/tickets/new/{page,NewTicketForm}.tsx`
**Estimated scope:** Medium–Large overall, so split into two Medium increments (A: 7 files, mostly small; B: 2 files)

---

### Task 6a: Ticket detail thread + author follow-up

**Description:** `GET /api/tickets/:id` (own only) returns the original query + public messages through an **author DTO, with no notes or AI fields** (`AuthorTicketDto` in `src/shared/dto.ts`; the mapper sits next to `ticketService`). `POST /api/tickets/:id/messages` adds a follow-up. On a RESOLVED ticket it reopens the ticket to OPEN and clears `resolvedAt`; on a CLOSED ticket it returns 409. UI: a chat-style thread at `/author/tickets/[id]` (the original query first, then messages oldest→newest), a reply box and a `StatusBadge`. Task 5's success redirect lands here.

**Status:** ✅ Done on branch `feat/ticket-detail`. Verified: 73 tests pass, lint clean, typecheck clean, 18/18 smoke checks pass.

**Acceptance criteria:**
- [x] Another author's ticket (GET or POST message) → 404, never 403, so the record's existence isn't revealed
- [x] The author DTO's exact keys are asserted in a test (no `notes`, no `aiConfidence`/`aiReasoning`/`*Source`, no `aiDraft`)
- [x] Follow-up on RESOLVED → reopened to OPEN. On CLOSED → 409 with a clear message shown in the UI

**Verification:**
- [x] Tests pass: DTO key set, reopen-on-reply, closed → 409 (mocked repo)
- [x] Build succeeds
- [x] `smoke:rbac` gets new rows: author B → A's ticket GET/POST → 404
- [x] Manual check: create a ticket → land on its thread → post a follow-up

**Dependencies:** Task 5
**Files likely touched:** `src/app/api/tickets/[id]/{route,messages/route}.ts`, `src/server/services/ticketService.ts`, `src/shared/dto.ts`, `src/app/author/tickets/[id]/page.tsx`, `src/components/StatusBadge.tsx`
**Estimated scope:** Medium

---

### Task 6b: My Tickets list

**Description:** `GET /api/tickets` (own only, newest first) is added to the route file from Task 5. The `/author/tickets` page lists subject, book (or "General"), status badge and last-updated, and each row links to its thread (6a). The empty state has a "Raise your first query" CTA → `/author/tickets/new`. This makes the "My queries" nav link work.

**Status:** ✅ Done on branch `feat/ticket-list`. Verified: 74 tests pass, lint clean, typecheck clean, 22/22 smoke checks pass.

**Acceptance criteria:**
- [x] The list shows only the signed-in author's tickets, newest first, and uses the same author DTO (no internal fields)
- [x] The empty state renders for an author with no tickets
- [x] Every status (Open / In Progress / Resolved / Closed) has a distinct, labelled badge (not colour alone)

**Verification:**
- [x] Tests pass: list service scoping + ordering (mocked repo)
- [x] Build succeeds
- [x] `smoke:rbac` gets new rows: A's and B's lists are disjoint
- [x] Manual check: an author with 0 tickets sees the empty state. Create 2 → both are listed, newest first, and clicking one opens its thread

**Dependencies:** Task 6a
**Files likely touched:** `src/app/api/tickets/route.ts`, `src/server/{services/ticketService,repositories/ticketRepo}.ts`, `src/app/author/tickets/page.tsx`
**Estimated scope:** Small

---

### ✅ Checkpoint 2: Author flow
- [x] Tests, lint and build are clean
- [x] `npm run smoke:rbac` (2 authors + admin against `npm run dev`) passes: cross-author books/tickets/messages → 404, author → admin routes → 403
- [x] Author logs in → books → raises a ticket → sees it listed (locally)
- [x] Review with human

---

## Phase 3: Admin Portal + real-time

### Task 7: Admin ticket queue with filters and urgency sorting

**Description:** `GET /api/admin/tickets` with zod-validated query params `status, category, priority, from, to, assignee (me|unassigned|id), q, page, pageSize`. The default view is unresolved tickets sorted by priority rank (Critical→Low; unclassified ranked as High until triaged), then oldest first. Order by a `priorityRank` Int column kept in sync by the service. UI: a filter bar (state in URL search params), a coloured priority badge, an age column (red past 48h), category or a "Needs triage" marker, assignee, author, book.

**Status:** ✅ Done on branch `feat/admin-queue`. Verified: 95 tests pass, lint clean, typecheck clean, 25/25 smoke checks pass.

**Acceptance criteria:**
- [x] Filters combine with AND. An invalid enum/date → 400
- [x] Default: open/in-progress tickets, most urgent then oldest at the top. Resolved/closed tickets only appear when filtered for
- [x] Filters survive a refresh and can be shared via the URL

**Verification:**
- [x] Tests pass: query schema. `buildTicketWhere/orderBy` unit tests
- [x] Build succeeds
- [x] `smoke:rbac` gets a new row: author → `GET /api/admin/tickets` → 403
- [x] Manual check: tickets from 2 authors, try each filter

**Dependencies:** Task 6b
**Files touched:** `src/app/api/admin/tickets/route.ts`, `src/shared/schemas/ticketQuery.ts`, `src/shared/schemas/ticketQuery.test.ts`, `src/server/repositories/ticketRepo.ts`, `src/server/repositories/ticketRepo.test.ts`, `src/server/services/adminTicketService.ts`, `src/server/services/adminTicketService.test.ts`, `src/app/admin/tickets/page.tsx`, `src/app/admin/tickets/QueueFilters.tsx`, `src/app/admin/tickets/AdminTicketQueue.tsx`, `src/components/PriorityBadge.tsx`
**Estimated scope:** Medium

---

### Task 8: Admin ticket detail: status, assign-to-me, internal notes, manual reply

**Description:**
- `GET /api/admin/tickets/:id` returns the ticket + thread + notes + context (author profile, the referenced book's full row, a summary of the author's other books).
- `PATCH /api/admin/tickets/:id` updates `status | category | priority | assigneeId`. Overrides set `*Source = MANUAL`. RESOLVED sets `resolvedAt`.
- `POST .../messages` sends a reply and moves OPEN → IN_PROGRESS automatically.
- `POST .../notes` adds an internal note.

UI: two columns (thread + reply box | context + controls), "Assign to me", and a notes panel labelled "Only visible to BookLeaf team".

**Status:** ✅ Done on branch `feat/admin-ticket-detail`. Verified: 113 tests pass, lint clean, typecheck clean, 31/31 smoke checks pass.

**Acceptance criteria:**
- [x] An admin reply shows up on the author's ticket view. Notes never do
- [x] Category/priority overrides persist, shown as "Manual"
- [x] Invalid status → 400. Unknown ticket → 404

**Verification:**
- [x] Tests pass: PATCH schema, MANUAL source logic, auto IN_PROGRESS on first reply
- [x] Build succeeds
- [x] `smoke:rbac` gets new rows: author → admin detail/PATCH/messages/notes → 403. After an admin note, the author's `GET /api/tickets/:id` doesn't contain the note text
- [x] Manual check: admin assigns, notes, replies, resolves. The author sees the reply (after a refresh at this stage)

**Dependencies:** Task 7
**Files touched:** `src/app/api/admin/tickets/[id]/{route,messages/route,notes/route}.ts`, `src/server/services/adminTicketService.ts`, `src/server/repositories/ticketRepo.ts`, `src/app/admin/tickets/[id]/{page,AdminTicketDetail,TicketControls,AuthorContextSidebar,InternalNotesPanel,TicketConversation}.tsx`
**Estimated scope:** Medium–Large

---

### Task 9: Real-time updates via Supabase Realtime Broadcast

**Description:** `src/server/realtime/broadcast.ts` sends `{ type, ticketId }` to the author's channel (`u:<realtimeKey>`) and the admin channel (`a:<ADMIN_REALTIME_KEY>`) through Supabase's HTTP broadcast endpoint (service-role key, server only). Call it from ticketService after create / message / status or triage changes. Broadcast failures are logged and never fail the request. Client: a `useLiveTickets` hook (Supabase browser client with the anon key) subscribes to the channel key from `/api/me` and invalidates the TanStack Query keys `['tickets']`, `['ticket', id]`, `['adminTickets']`, and `['adminTicket', id]`. Add a "Live" indicator. Fallback is `refetchOnWindowFocus: true` + `staleTime: 10s`.

**Status:** ✅ Done on branch `feat/realtime-broadcast`. Verified: 123 tests pass (15 files), lint clean (0 errors, 0 warnings), typecheck clean, 31/31 smoke checks pass.

**Acceptance criteria:**
- [x] With an author tab and an admin tab open, an admin reply/status change appears for the author without a refresh within ~2s
- [x] New tickets (and their later AI triage) appear in the admin queue without a refresh
- [x] Broadcast payloads contain strictly `{ type, ticketId }` — zero customer data, ticket text, or message content. All data is fetched via authenticated REST. If Realtime is down, pages still update via polling

**Verification:**
- [x] Tests pass: broadcast formatting, topic filtering, error suppression (`src/server/realtime/broadcast.test.ts`), browser client singleton (`src/lib/supabaseBrowser.test.ts`), ticketService/adminTicketService broadcast dispatch
- [x] Build succeeds, typecheck passes (`tsc --noEmit`), lint passes cleanly (`eslint`)
- [x] `smoke:rbac` passes 31/31 checks

**Dependencies:** Task 8
**Files touched:** `src/server/realtime/broadcast.ts`, `src/server/realtime/broadcast.test.ts`, `src/server/services/ticketService.ts`, `src/server/services/adminTicketService.ts`, `src/lib/supabaseBrowser.ts`, `src/lib/supabaseBrowser.test.ts`, `src/hooks/useLiveTickets.ts`, `src/components/LiveIndicator.tsx`, `src/components/AppHeader.tsx`, `src/components/Providers.tsx`, `src/shared/dto.ts`
**Estimated scope:** Medium

---

### ✅ Checkpoint 3: Manual ticket lifecycle
- [ ] Tests, lint, build and `smoke:rbac` are clean (locally)
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
- [ ] Tests, lint and build are clean
- [ ] With the key: live triage + drafts work locally
- [ ] **Then run Task 4b (deploy)** before Phase 5
- [ ] With `AI_FORCE_FAIL=true`: ticket creation, fallback triage and manual replies all work
- [ ] Review with human

---

## Phase 5: Documentation & Ship

### Task 14: OpenAPI spec + `/api-docs`

**Description:** An OpenAPI 3 spec generated from the zod schemas (`@asteasolutions/zod-to-openapi`) or a hand-written `openapi.yaml`. It covers every route, auth (Auth.js session cookie; explain how the login flow works), the role per endpoint, and error codes. Serve it at `GET /api/openapi` and render it with Swagger UI at `/api-docs`.

**Acceptance criteria:**
- [ ] Every `src/app/api/**/route.ts` (except the Auth.js catch-all, which is documented separately) is in the spec. A parity test enforces this
- [ ] Each endpoint lists its role and error responses
- [ ] `/api-docs` loads (locally, and on the live URL once Task 4b is done)

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
