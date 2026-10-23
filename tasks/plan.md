# Implementation Plan: BookLeaf Author Support & Communication Portal

## Overview

A web app with two interfaces: an **Author Portal** (log in, view my books and royalties, raise support tickets, follow replies live) and an **Admin Portal** (a ticket queue triaged by AI, AI-drafted replies based on the BookLeaf Knowledge Base, status/assignment/internal notes). A REST API with role-based access sits between them. The app is seeded with the provided dataset (10 authors, 18 books) and deployed at one live URL.

Evaluation weights shape the priorities: AI integration counts for 25% and architecture/code quality for 25%, then API design 15%, functionality 15%, product thinking 10% and docs 10%. Deadline: **4 days**. If time runs short, the order is core ticket flow, then AI, then polish.

**Confirmed stack:** Next.js (App Router, TypeScript) · Prisma ORM · Supabase Postgres (database only) · Auth.js v5 (free, open source) · Google Gemini · Vercel.

Detailed tasks with acceptance criteria are in [todo.md](todo.md).

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| App framework | **Next.js 15 App Router**, one app | One codebase and one deploy. The REST API is **Route Handlers under `src/app/api/**`**, and the UI is React Server/Client Components. |
| Layering | `app/api/*/route.ts` (thin: parse → call service → respond) → `src/server/services/*` → `src/server/repositories/*` → Prisma. Every server module starts with `import 'server-only'` | Separation of concerns (25% criterion). Business logic never lives in route files. If server code is imported into a client component, **the build fails**, which protects the keys. |
| Database | **Supabase Postgres** accessed **only through Prisma**. `DATABASE_URL` = Supabase pooler (port 6543, `?pgbouncer=true`) for runtime; `DIRECT_URL` = port 5432 for migrations | Prisma gives a typed schema, versioned migrations and enums. The pooler is required for Vercel serverless (many short-lived connections). |
| Lock down Supabase's auto REST API | A migration **enables RLS with no policies on every table**. Prisma connects as the `postgres` role, which bypasses RLS | Supabase automatically exposes the `public` schema over its REST API to anyone holding the anon key, and the anon key ends up in the browser for Realtime. Deny-all RLS closes that hole. The README calls this out explicitly. |
| Auth | **Auth.js v5, Credentials provider** (email + password, `bcryptjs`), **JWT session strategy** in an httpOnly cookie. The token carries `userId`, `role`, `authorId`. Config is split into `auth.config.ts` (edge-safe, used by `middleware.ts`) and `auth.ts` (Prisma + bcrypt) | Free, no external service, users live in our own `User` table. `bcryptjs` is pure JS, so there are no native build issues on Windows or Vercel. |
| RBAC | `withAuth(handler, { roles })` wraps every protected route handler: 401 with no session, 403 for the wrong role. **Repositories scope every author query by `authorId` from the session**, never from the request body/URL | One choke point for authn. Ownership is enforced structurally. A cross-author id returns 404, which doesn't reveal the record exists. |
| Validation and errors | zod schemas in `src/shared/schemas`, shared by forms and route handlers. `apiHandler` maps `AppError` / `ZodError` / Prisma known errors (P2025 → 404, P2002 → 409) to `{ error: { code, message, details } }` | Meaningful, consistent errors instead of generic 500s. |
| Real-time | **Supabase Realtime Broadcast** used only as an "invalidate" signal. After a mutation, the server sends `{ type, ticketId }` (no ticket content) to the affected channels, and the client refetches through the protected REST API (TanStack Query invalidation). Channels: each user's **unguessable `realtimeKey` (uuid)**, plus an admin channel key handed only to admin sessions. Fallback: 30s polling + refetch on window focus | Instant updates without needing Supabase Auth. No data travels over Realtime, so all data access still goes through authn/RBAC. Vercel functions are stateless, so an in-process SSE bus isn't an option. |
| Background AI work | Next.js **`after()`** runs classification after the 201 response is sent (on Vercel it uses `waitUntil`) | Ticket creation never waits on the AI. No queue infrastructure needed for the demo. A durable queue is listed as a production step. |
| UI | Tailwind + a few small components, TanStack Query on the client | The spec says a clean, functional UI is enough. |
| Deploy | **Vercel** (app) + **Supabase** (Postgres + Realtime) | Native platform for Next.js, with free tiers. |
| LLM | **Google Gemini, Flash tier** (model ID from the `GEMINI_MODEL` env var) via the official `@google/genai` SDK, server-side only | The user already has a key. Flash is cheap and fast, and supports **JSON output constrained by `responseSchema` with enums**, which is ideal for classification. Confirm the current Flash model ID and pricing at Task 10. |

### Secrets

| Variable | Exposure |
|---|---|
| `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_REALTIME_KEY` | **Server only**. No `NEXT_PUBLIC_` prefix, read only inside `server-only` modules |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design. Only used to *listen* to broadcast channels. The tables are locked by deny-all RLS |

### AI design (the highest-weighted area)

1. **Ticket creation never waits on AI.** `POST /api/tickets` inserts the ticket and returns 201, then `after()` classifies it, updates the row and broadcasts `ticket.updated` to admins.
2. **One call for classification and priority.** A single Gemini call with `responseMimeType: application/json` + a `responseSchema` (category enum ×6, priority enum ×4, confidence, one-line reasoning), `temperature: 0`, and small `maxOutputTokens`. The prompt has category definitions + a priority rubric with examples ("no royalty for 6 months" → High/Critical, "update bio" → Low, ISBN errors → High per policy) + a few facts about the book. It includes **no KB policy text**, since classification doesn't need it.
3. **Drafts are lazy and cached.** A draft is generated only when an admin first opens a ticket, stored in `AiDraft` and reused. It's regenerated only on "Regenerate" or after a new author message.
4. **Context is chosen per call, not dumped.**
   - The KB is stored as **sections keyed by category**. The prompt gets tone guidelines + the one matching policy section + 1–2 matching sample Q→A examples.
   - Facts are computed in code and handed to the model. The referenced book's row only, pending royalty vs the ₹1,000 threshold, the **next payout date** (quarter end + 45 days), and the production stage. The model words the reply; it does no arithmetic or date logic.
   - Thread history is capped at the last 6 messages.
   - The stable prompt prefix goes first (`systemInstruction`), so Gemini's implicit prefix caching can apply. Explicit context caching isn't worth it at this KB size, and the README says why.
5. **Graceful degradation.** The client has a timeout, and retries 429/5xx with exponential backoff (max 2). Other errors fail fast.
   - If classification fails, a **keyword heuristic fallback** sets category and priority with `source = FALLBACK`.
   - If drafting fails, the admin sees "AI draft unavailable — write manually" + Retry, and the reply box always works.
   - A missing key or `AI_FORCE_FAIL=true` works like an outage, so it's easy to demo.
6. **Overrides are tracked.** `categorySource` / `prioritySource` ∈ {AI, FALLBACK, MANUAL}, shown as badges. These are the labels a future accuracy dashboard would use.
7. **Usage is logged.** Every call writes `AiCall` (purpose, model, input/output tokens from `usageMetadata`, latency, ok/error). This is the evidence for cost awareness, summarised in the README.

## Project Structure

```
prisma/              schema.prisma, migrations/, seed.ts, data/bookleaf_sample_data.json
src/
  auth.ts, auth.config.ts, middleware.ts
  app/
    login/page.tsx
    author/          books/, tickets/, tickets/new/, tickets/[id]/
    admin/           tickets/, tickets/[id]/
    api/
      auth/[...nextauth]/route.ts      (Auth.js: signin, signout, session, csrf)
      me/route.ts, me/books/route.ts
      tickets/route.ts, tickets/[id]/route.ts, tickets/[id]/messages/route.ts
      admin/tickets/route.ts, admin/tickets/[id]/{route,messages,notes,draft,classify}/route.ts
      health/route.ts, openapi/route.ts
    api-docs/page.tsx                  (Swagger UI)
  server/            (server-only)
    http/            apiHandler, withAuth, AppError
    db.ts            Prisma singleton
    repositories/    bookRepo, ticketRepo, messageRepo, noteRepo, aiRepo
    services/        bookService, ticketService
    realtime/        broadcast.ts (server → Supabase Broadcast)
    ai/              client, knowledgeBase, facts, classifier, heuristicClassifier, contextBuilder, drafter, prompts/
  shared/            zod schemas, enums, DTO types
  components/, hooks/ (useLiveTickets), lib/ (format, apiClient, supabaseBrowser)
scripts/             smokeRbac.ts, evalPrompts.ts, aiPing.ts
```

## Dependency Graph

```
Next.js scaffold + http layer (apiHandler, AppError, health)
   │
   ├── Prisma schema + migrations (incl. deny-all RLS) on Supabase + seed
   │      │
   │      └── Auth.js credentials + middleware + withAuth roles ── Login UI + role routing
   │              │
   │              ├── Author: My Books ── Submit Ticket ── My Tickets (list + detail)
   │              │                            │
   │              ├── Admin: Queue (filters/sort) ── Ticket detail (status, assign, notes, reply)
   │              │                            │
   │              └── Realtime broadcast (server send + client listen/invalidate) ◄──┘
   │
   └── AI module (Gemini client, KB sections, facts, usage log)
          ├── Classification + priority (after() on create, override via PATCH)
          └── Draft generation (admin ticket detail)
                 └── Prompt eval script
```

## Data Model (Prisma)

- `User` (id cuid, email unique, passwordHash, name, role AUTHOR|ADMIN, authorId? unique → Author, realtimeKey uuid unique)
- `Author` (id String "AUTH001", name, email, phone, city, joinedDate)
- `Book` (id String "BK001", authorId, title, isbn, genre, publicationDate?, status String, mrp?, royaltyPerCopy?, copiesSold, royaltyEarned, royaltyPaid, royaltyPending, lastPayoutDate?, printPartner?, availableOn String[])
- `Ticket` (id cuid, authorId, bookId?, subject, description, status enum, category enum?, categorySource?, priority enum?, prioritySource?, aiConfidence?, aiReasoning?, assigneeId? → User, attachmentName?, createdAt, updatedAt, resolvedAt?)
- `TicketMessage` (id, ticketId, senderId, senderRole, body, usedAiDraft, createdAt)
- `InternalNote` (id, ticketId, adminId, body, createdAt). A separate model, so notes can't leak into author queries by accident.
- `AiDraft` (ticketId @id, body, model, basedOnMessageCount, createdAt)
- `AiCall` (id, ticketId?, purpose CLASSIFY|DRAFT, model, inputTokens, outputTokens, latencyMs, ok, errorCode?, createdAt)

Indexes: `Ticket(status, priority, createdAt)`, `Ticket(authorId, createdAt)`. Money is stored as integer rupees (the dataset has no paise).

## REST API

| Method & path | Role | Purpose |
|---|---|---|
| `/api/auth/*` (Auth.js: `POST callback/credentials`, `POST signout`, `GET session`, `GET csrf`) | public | Session management |
| GET `/api/me` | any | Current profile (role, name, authorId, realtime channel key) |
| GET `/api/me/books` | AUTHOR | Own books |
| GET, POST `/api/tickets`; GET `/api/tickets/:id` | AUTHOR (own) | Author tickets (never internal notes) |
| POST `/api/tickets/:id/messages` | AUTHOR (own) | Author follow-up |
| GET `/api/admin/tickets?status=&category=&priority=&from=&to=&assignee=&q=&page=` | ADMIN | Queue |
| GET, PATCH `/api/admin/tickets/:id` | ADMIN | Detail (+ notes, author/book context); update status/category/priority/assignee |
| POST `/api/admin/tickets/:id/messages` | ADMIN | Send reply |
| POST `/api/admin/tickets/:id/notes` | ADMIN | Internal note |
| GET `/api/admin/tickets/:id/draft` (`?regenerate=true`) | ADMIN | AI draft |
| POST `/api/admin/tickets/:id/classify` | ADMIN | Re-run AI triage |
| GET `/api/health` | public | Liveness + DB reachable + AI configured flag |
| GET `/api/openapi`, page `/api-docs` | public | API docs |

## Task List (index — details in todo.md)

### Phase 1: Foundation
- [ ] Task 1: Next.js scaffold + API error layer + health endpoint
- [ ] Task 2: Prisma schema on Supabase + deny-all RLS + seed from the provided JSON
- [ ] Task 3: Login end-to-end (Auth.js credentials, middleware, withAuth roles, role routing)

### Checkpoint 1: Foundation + early deploy (Vercel + Supabase)

### Phase 2: Author Portal
- [ ] Task 4: My Books page (incl. in-production and zero-royalty edge cases)
- [ ] Task 5: Submit a support ticket (no AI yet)
- [ ] Task 6: My Tickets list + ticket detail thread

### Checkpoint 2: Author flow

### Phase 3: Admin Portal + real-time
- [ ] Task 7: Admin ticket queue with filters and urgency sorting
- [ ] Task 8: Admin ticket detail: status, assign-to-me, internal notes, manual reply
- [ ] Task 9: Real-time updates via Supabase Realtime Broadcast

### Checkpoint 3: Manual ticket lifecycle (works with zero AI)

### Phase 4: AI Integration (Gemini)
- [ ] Task 10: AI module foundation (Gemini client, KB sections, facts, usage logging)
- [ ] Task 11: Auto-classification + priority with fallback and admin override
- [ ] Task 12: AI-drafted responses with targeted context, caching, edit and send
- [ ] Task 13: Prompt evaluation against the KB sample queries + tuning

### Checkpoint 4: AI complete (and verified degraded mode)

### Phase 5: Documentation & Ship
- [ ] Task 14: OpenAPI spec + `/api-docs`
- [ ] Task 15: README, 1-page write-up, final deploy, demo credentials

### Checkpoint 5: Submission ready

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase auto-REST exposing tables via the public anon key | High | Deny-all RLS migration (Task 2). Verified with a `curl` to `/rest/v1/tickets` using the anon key, which must return `[]`/401. |
| Prisma + Vercel connection exhaustion | Med | Pooler URL (6543, `pgbouncer=true`, `connection_limit=1`) for runtime, `DIRECT_URL` for migrations, Prisma client singleton. |
| Deployment surprises late (env vars, Auth.js `AUTH_SECRET`/`AUTH_URL`, cookies) | High | Deploy at Checkpoint 1. |
| `after()` cut off / function timeout on slow Gemini calls | Med | `maxDuration` on the AI routes, classifier timeout ~8s → fallback. Unclassified tickets show "Needs triage" with a Reclassify button. |
| Gemini free-tier rate limits while evaluators test | High | Async classification + heuristic fallback + cached drafts keep calls low. The manual path is always available. Consider enabling billing before submission. |
| Supabase free project **pauses after ~7 days of inactivity** | High | Keep it active until review (scheduled ping to `/api/health`). Noted in the README. |
| Broadcast channel names guessed | Low | Channels use random per-user uuids, and payloads carry only `{type, ticketId}`. Data is always fetched via the authenticated REST API. Supabase private channels are the production upgrade. |
| Data leak between authors | High | `withAuth` + repository scoping + `npm run smoke:rbac` (logs in as 2 authors + admin and asserts the 403/404 matrix) at every checkpoint. |
| Drafts invent policy or numbers | High | Facts computed in code, strict prompt rules, Task 13 eval. |
| 4-day timebox | High | Phases ordered by spec priority. The optional list gets cut first. |

## Open Questions (still need your input)

1. **Demo credentials:** OK to seed every author with the shared password `Author@123` and two admins (`admin@bookleaf.com`, `ops@bookleaf.com` / `Admin@123`)?
2. **"Today" for payout dates:** use the real current date (planned; overridable via the `APP_TODAY` env var)?
3. **Accounts:** you'll need to create a Supabase project and a Vercel account, then paste the connection strings and keys into `.env.local` yourself. Never paste secrets into chat.
4. **Git:** OK to run `git init` in Task 1 and commit after each task?
