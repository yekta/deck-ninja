# Lexeme

Spaced repetition, local-first. The whole account lives on the device: decks
open, cards get written and a study session runs start to finish with no
network, and everything syncs when there is one.

## Layout

A pnpm workspace. Apps consume packages; packages export raw `.ts`, so there is
no build step between them.

```
apps/
  web        Vite + React + TanStack Router. A static bundle → Cloudflare Pages.
  server     Hono on Node. Auth, the two Zero endpoints, exports, model calls
             → Railway.
packages/
  db         Drizzle schema, the Postgres client, and the migrations.
  contracts  What both ends have to agree on: the Zero schema, the synced
             queries, the shared mutators, and the HTTP request/response shapes.
  shared     Domain code with no side of its own: FSRS, study bucketing, the
             card-state enum, the export format.
```

Plus **zero-cache**, which is not in this repo: it replicates Postgres and
serves each client its slice. It calls back into `apps/server` to decide what a
client may see and to apply what it writes.

## How the data flows

There is no read API and no write API. Every screen reads Zero synced queries
against a local replica, and every write is a **shared mutator**, the same
function run twice: optimistically in the browser against its own store, then
authoritatively on the server inside a Postgres transaction, with a context
derived from the verified session rather than from anything the client claimed.
That is also the whole of the authorization model: every query and every mutator
scopes rows to `ctx.user_id` (`packages/contracts`).

What is left on HTTP is only what has no local equivalent:

| Endpoint | Why it is not a mutator |
| --- | --- |
| `POST /api/zero/query`, `/api/zero/mutate` | zero-cache calls these; they *are* the sync |
| `GET /api/decks/:id/export` | a different artefact from the synced rows, no ids, no FSRS state |
| `POST /api/cards/generate-back`, `/generate-card` | an API key that must never reach a browser |
| `GET /api/avatar` | cross-origin isolation drops Google's avatars; this re-serves them with a CORP header |
| `GET,POST /api/auth/*` | Better Auth |

## Running it

```sh
pnpm install
cp .env.example .env      # then fill it in
pnpm db:migrate           # once, and after any schema change
pnpm dev                  # web on :3000, api on :3001
pnpm dev:zero-cache       # in a second terminal
```

The web dev server proxies `/api` to the API, so everything is one origin and
the session cookie is first-party, no CORS or cookie-domain setup to develop.

```sh
pnpm typecheck   # every workspace
pnpm test        # packages/shared
pnpm build       # web → apps/web/dist, server → apps/server/dist
pnpm db:sync     # copy one Postgres into another, see .env.example
```

## Two things that will bite you

**Cross-origin isolation.** The FSRS optimizer is a threaded wasm build, so it
needs `SharedArrayBuffer`, which browsers only grant to a cross-origin isolated
document. `apps/web/public/_headers` sets `COOP: same-origin` and
`COEP: require-corp`; `vite.config.ts` repeats them for dev. If they stop being
served, auto-calibration silently declines to run and says so only in a console
line. Check `crossOriginIsolated` in the console after a deploy.

**The Zero publication.** `packages/db/drizzle/0003` creates the `zero_data`
publication, and it must list exactly the tables in
`packages/contracts/src/schema.ts`. A table Zero syncs but the publication omits
reaches the client as a permanently empty view. It is also what keeps the Better
Auth tables out of every client's replica.

See [DEPLOY.md](./DEPLOY.md) for hosting.
