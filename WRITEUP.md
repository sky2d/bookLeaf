# Architecture & Design Write-Up — BookLeaf Author Support Portal

## 1. Core Priorities

When authors contact support regarding publication delays or missing royalties, they are often anxious and frustrated. Our portal architecture was built around three non-negotiable priorities:
1. **Zero Hallucination & Deterministic Facts**: LLMs are notorious for mathematical errors. We explicitly forbid Gemini from performing arithmetic. All book royalties, pending balances, and next payout dates are computed deterministically in code (`src/server/ai/facts.ts`) and injected as verified truths.
2. **Author Empathy & Staff Speed**: Operations staff receive pre-drafted, empathetic responses adhering to company policy in one click. By grounding Gemini in category-specific knowledge base sections, drafts acknowledge author distress first and commit to specific turnaround SLAs.
3. **Operational Continuity & Zero-Cost Defense**: Under high ticket surges or API rate limits, support must never stall. The system implements caching to save 100% of repeated draft tokens and seamless keyword-heuristic fallbacks when Gemini is unreachable.

---

## 2. Key Architecture Trade-Offs

### Prisma ORM with PgBouncer vs Supabase Client
- **Decision**: All database access goes through Prisma ORM 7 using the PostgreSQL driver adapter.
- **Trade-off**: While the Supabase client offers direct frontend-to-database access, it scatters business logic across client components and PostgreSQL row-level security functions. Prisma centralizes data access into strict server repositories (`ticketRepo`, `bookRepo`), guaranteeing type safety, atomic transactions, and zero risk of leaking connection credentials to client bundles.

### Deny-All Database RLS + Server-Side RBAC
- **Decision**: PostgreSQL tables feature `DENY ALL` RLS policies.
- **Trade-off**: Rather than managing complex SQL security policies for every table relation, all authorization is strictly enforced at the application boundary via `withAuth()` role guards. An author cannot query, insert, or modify records outside their verified session ID, verified through automated smoke tests.

### Realtime Broadcast as an Invalidation Signal
- **Decision**: Supabase Realtime is used strictly for non-blocking broadcast pulses (`{ type: "TICKET_UPDATED", ticketId }`), not data payload streaming.
- **Trade-off**: Streaming full records over WebSocket channels introduces the danger of broadcasting sensitive author data to unintended clients. By using broadcast purely as a cache-invalidation trigger, client browsers re-fetch only what their own session cookie authorizes them to see.

### Next.js `after()` vs Durable Job Queue
- **Decision**: Asynchronous triage uses Next.js 16's native `after()` primitive.
- **Trade-off**: An external Redis/BullMQ worker pipeline adds deployment complexity, operational overhead, and external failure points. `after()` allows ticket creation to complete in <200ms while running background AI classification. For enterprise multi-node scaling, swapping `after()` for a durable queue requires changing only one service call.

---

## 3. Path to Production

To transition this portal from prototype to high-scale enterprise deployment:
1. **Durable Worker Queue**: Migrate the `after()` triage hook to BullMQ with Redis or AWS SQS to guarantee at-least-once execution across serverless cold starts and process termination.
2. **Storage Bucket Provisioning**: Activate a private Supabase Storage bucket with signed short-lived URLs for manuscript excerpts and print defect photos.
3. **Outbound Notification Layer**: Connect Resend or AWS SES to send email alerts on status changes and team replies.
4. **Author Self-Service Closure & CSAT**: Enable authors to mark resolved tickets and provide 1–5 star satisfaction ratings to feed admin operational metrics.
