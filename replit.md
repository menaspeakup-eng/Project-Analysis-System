# انطق (Antuq)

An Arabic-language platform that teaches children (5+) reading and pronunciation through AI-powered speech analysis, games, and rewards, with a teacher dashboard for schools/kindergartens.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/antuq run dev` — run the "انطق" web frontend (artifact, previewPath `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; Clerk secrets (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`) already provisioned

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Clerk (Replit-managed), Google OAuth + email/password, plus a no-account "guest" mode
- Frontend: React + Vite (`artifacts/antuq`), RTL Arabic, Tailwind v4, wouter routing

## Where things live

- `artifacts/antuq` — the "انطق" web frontend (landing page, Clerk sign-in/sign-up, `/portal` = student home page, `/character` = avatar customization page)
- `artifacts/api-server` — Express API; Clerk proxy + middleware wired in `src/app.ts` / `src/middlewares/clerkProxyMiddleware.ts`
- `lib/api-spec/openapi.yaml` — `/healthz`, `/student/me`, `/student/avatar` (PATCH), `/student/daily-challenge` (GET + `/complete` POST), `/leaderboard`
- `lib/db/src/schema/students.ts` — `students` table (clerkUserId, name, points, avatarConfig jsonb); `daily_challenges` table (one row per date, backfilled on demand from a fixed prompt bank); `student_challenge_completions` (idempotent completion + points award, unique per student+challenge)
- `artifacts/antuq/src/lib/avatarPresets.ts` — shared bg-color/accessory preset maps used by both `/portal` and `/character` so previews stay in sync

## Architecture decisions

- Auth uses Clerk (Google OAuth + email/password) rather than custom passport/JWT, per platform default.
- A "continue as guest" path (no account) is implemented as a `localStorage` flag (`antuq-guest`), separate from Clerk sessions, so kids/parents can try the app without signing up.
- Deeper product features (AI pronunciation analysis, games, lessons, rewards, chat, AI story generator, teacher dashboard) are intentionally deferred — the current build covers the public landing page, auth entry point, a real student home page (profile + points + avatar + daily challenge + leaderboard), with "قريباً" (coming soon) placeholders for the rest.
- The level-placement test (اختبار تحديد المستوى) from the original spec was explicitly dropped from scope per user request — do not build it unless asked again.
- Guests (no Clerk account) never get a `students` DB row — their points always render as 0 client-side, and daily-challenge/avatar-edit actions are disabled for them, since there's no account to persist against.
- Avatar customization is a preset system (background color + one accessory emoji overlaid on the existing mascot image), not freeform art — there's no per-user illustration pipeline.
- Daily challenges come from a small fixed rotating prompt bank, selected deterministically by day-of-year and persisted to `daily_challenges` on first request each day — there's no teacher-authoring tool yet.
- Points only grow through one real action so far: completing the daily challenge (idempotent, once per day), which feeds both the progress bar and the leaderboard.

## Product

- Public landing page introducing the platform to parents/teachers/kids, in Arabic (RTL).
- Sign-in / sign-up via Clerk (Google OAuth + email/password), fully re-themed to match brand.
- "Continue as guest" — no-account entry into the student home page (points always 0, no persistence).
- Student home page (`/portal`): profile name/photo, points progress bar toward next level, clickable avatar (opens `/character`), real daily challenge card (fetch + complete for points), real leaderboard (top 10 + own rank if outside top 10), achievements placeholder, and a shortcuts grid for the rest of the platform.
- Avatar customization page (`/character`): background color swatches + accessory picker with live preview, saved via `PATCH /student/avatar`.
- Not yet built: AI pronunciation coaching, learning games, achievements detail, public chat, AI-personalized stories, teacher dashboard, level-placement test (intentionally dropped).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Clerk proxy middleware in `artifacts/api-server` must stay mounted before body parsers (`express.json()`); moving it after breaks the proxy.
- When adding new frontend deps that touch Clerk/Tailwind, keep the `@tailwindcss/vite` plugin's `optimize: false` option if added later for Clerk compatibility.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
