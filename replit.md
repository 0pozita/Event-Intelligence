# AIEngine

AI-powered information verification and event intelligence platform. Users search for events, read evidence-backed briefs, inspect trust scores, and run AI fact checks on any claim.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 via proxy at /api)
- `pnpm --filter @workspace/aiengine run dev` — run the React frontend (port 22228 via proxy at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `OPENAI_API_KEY` — enables GPT-4o-mini fact checking
- Optional env: `GEMINI_API_KEY` — enables Gemini 2.0 fact checking (fallback if no OpenAI key)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (9 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui

## Where things live

- `lib/db/src/schema/` — all 9 DB tables (users, events, sources, articles, claims, evidence, timeline_entries, fact_checks, search_history)
- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated TanStack Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `artifacts/api-server/src/routes/` — Express route handlers (events, sources, claims, evidence, fact-check, timeline, search)
- `artifacts/api-server/src/lib/` — trust-score.ts, fact-check providers (mock/openai/gemini), logger
- `artifacts/aiengine/src/pages/` — home, event-detail, fact-check, trending, not-found
- `artifacts/aiengine/src/components/` — layout, trust-score (animated SVG ring), shadcn/ui

## Architecture decisions

- **Contract-first API**: OpenAPI spec written first, hooks and Zod schemas generated via Orval. Never hand-write types that codegen produces.
- **Fact check provider chain**: Checks `OPENAI_API_KEY` first, then `GEMINI_API_KEY`, falls back to deterministic mock. Provider failures fall back to mock automatically.
- **Trust score formula**: `(sourceCredibility × 0.4) + (evidenceStrength × 0.4) + (crossSourceAgreement × 0.2)`. Ratings: 0-39 = Low, 40-69 = Medium, 70+ = High.
- **Fact check flow**: Frontend creates a Claim (POST /claims) then immediately runs POST /fact-check with the returned claimId. The server updates the claim status after analysis.
- **Express 5 pattern**: Never `return res.json(...)` — always `res.json(...); return;` to avoid TS7030.

## Product

- **Home**: Hero search bar with live inline results, trending event cards below
- **Event Detail**: Full intelligence brief — summary, trust score gauge, extracted claims with verification status, source credibility matrix, chronological timeline
- **Fact Checker**: Enter any claim text → AI analyzes and returns verdict (True/False/Partially True/Unverified), trust score, reasoning, and evidence summary
- **Trending**: Grid of all events ranked by activity, filterable by category

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any `lib/db` schema change: run `pnpm run typecheck:libs` before api-server typecheck
- OpenAPI body schema naming: entity-shaped names (EventInput, not CreateEventBody) to avoid TS2308 collisions
- Do NOT run `pnpm dev` at workspace root — use restart_workflow instead
- Express 5: always `res.json(...); return;` not `return res.json(...)`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
