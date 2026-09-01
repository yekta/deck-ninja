## What is this?

Lexeme is a local-first spaced repetition app. The whole account lives on the
device: decks open, cards get written and a study session runs start to finish
with no network, and everything syncs when there is one. This is the pnpm
monorepo for it.

## Repo Structure:

Apps consume packages; packages export raw `.ts`, so there is no build step
between them.

### 1- apps/web

The UI. Vite + React + TanStack Router, styled with tailwindcss and a small
shadcn-style component set in `src/components/ui`. Built to a static bundle for
Cloudflare Pages. Every screen reads Zero synced queries against a local
replica; there is no read API to call.

### 2- apps/server

Hono on Node, deployed to Railway. Auth (Better Auth), the two Zero endpoints
that zero-cache calls back into, deck exports, and the model calls that need an
API key kept off the browser. The web dev server proxies `/api` here so
everything is one origin in development.

### 3- packages/contracts

What both ends have to agree on: the Zero schema, the synced queries, the
shared mutators, and the HTTP request/response shapes. Every write is a shared
mutator, the same function run optimistically in the browser and
authoritatively on the server inside a Postgres transaction, with `ctx` derived
from the verified session. Every query and mutator scopes rows to
`ctx.user_id`; that is the whole authorization model.

### 4- packages/db and packages/shared

`db` is the Drizzle schema, the Postgres client and the migrations. `shared` is
domain code with no side of its own: FSRS, study bucketing, the card-state
enum, the export format. Tests live next to the code they test in
`packages/shared`.

Plus **zero-cache**, which is not in this repo: it replicates Postgres and
serves each client its slice (`pnpm dev:zero-cache` runs it locally).

## General Rules:

- Keep it simple. Do not overcomplicate things.
- `apps/web` and `apps/server` are coupled through `packages/contracts`. When
  you change a query, mutator or schema, both ends move together — the
  `@rocicorp/zero` pin is exact because all three parties speak one wire
  protocol.
- Do not leave paragraphs of comments on top of the code. You should try to
  avoid them as much as possible with understandable function names and code.
  If they are necessary even then, make them concise. Remove such comments when
  you come by them in the codebase. Comments should always move with code, not
  be left behind.
- Do not edit generated code: `apps/web/src/routeTree.gen.ts` (written by the
  router plugin on every build) and `packages/db/drizzle/*` (edit
  `packages/db/src/schema.ts` and run `pnpm db:generate` instead).
- A schema change is not done until its migration exists and the Zero
  publication still matches: `zero_data` (migration 0003) must list exactly the
  tables in `packages/contracts/src/schema.ts`, or the table syncs as a
  permanently empty view. It is also what keeps the auth tables out of client
  replicas.
- Better Auth is pinned exactly because it owns database columns; bumping it is
  a schema change and moves only with a migration.
- The FSRS optimizer needs cross-origin isolation (`SharedArrayBuffer`). Do not
  break the COOP/COEP headers in `apps/web/public/_headers` and
  `vite.config.ts`; the failure is silent.
- Use guard statement patterns in any code you write.
- Tests should cover input/output of domain logic, not trivia.
- Reinvent the wheel but do not reinvent the car. If you are solving a simple
  problem do not introduce a library. If you are solving a complex but common
  problem, there is likely a modern library for it, if so, use it.
- Do not start editing code in response to a question. We'll tell you when to
  edit code.
- If we are missing a glaring issue when we ask you to do something, do not
  hesitate to point it out.
- Never commit or push code unless explicitly asked to do so.
- Never make a PR unless explicitly asked to do so.
- Do not insert yourself into our code, commits or PRs in any way. Our codebase
  is not your ad space.
- After you make code changes, run `pnpm typecheck`, `pnpm lint` and
  `pnpm test` and fix what they raise.

## Commit Messages

A short imperative sentence describing the change, no prefixes:

    Disable automatic capitalization in card forms
    Distinguish offline devices from unreachable sync services

The title should be concise. Description should explain the work in more
detail (only if required) while still being concise. Use simple language, do
not try to sound smart.
