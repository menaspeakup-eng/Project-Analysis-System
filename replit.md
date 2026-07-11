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

- `artifacts/antuq` — the "انطق" web frontend (landing page, Clerk sign-in/sign-up, `/portal` = student home page)
- `artifacts/api-server` — Express API; Clerk proxy + middleware wired in `src/app.ts` / `src/middlewares/clerkProxyMiddleware.ts`
- `lib/api-spec/openapi.yaml` — `/healthz` + `/student/me` (JIT-provisioned student profile/points)
- `lib/db/src/schema/students.ts` — `students` table (clerkUserId, name, points); one row per Clerk account, created on first `/student/me` call

## Architecture decisions

- Auth uses Clerk (Google OAuth + email/password) rather than custom passport/JWT, per platform default.
- A "continue as guest" path (no account) is implemented as a `localStorage` flag (`antuq-guest`), separate from Clerk sessions, so kids/parents can try the app without signing up.
- Deeper product features (AI pronunciation analysis, games, lessons, rewards, leaderboard, chat, AI story generator, teacher dashboard) are intentionally deferred — the current build covers the public landing page, auth entry point, and a real student home page (profile + points), with "قريباً" (coming soon) placeholders for the rest.
- The level-placement test (اختبار تحديد المستوى) from the original spec was explicitly dropped from scope per user request — do not build it unless asked again.
- Guests (no Clerk account) never get a `students` DB row — their points always render as 0 client-side, since there's no account to persist against.

## Product

- Public landing page introducing the platform to parents/teachers/kids, in Arabic (RTL).
- Sign-in / sign-up via Clerk (Google OAuth + email/password), fully re-themed to match brand.
- "Continue as guest" — no-account entry into the student home page (points always 0, no persistence).
- Student home page (`/portal`): profile name/photo, points progress bar toward next level, avatar mascot, and shortcut cards for daily challenge, achievements, games, library, leaderboard, and public chat — all marked "قريباً" until their backends exist.
- Not yet built: AI pronunciation coaching, learning games, avatar customization, daily challenges, achievements, leaderboard, public chat, AI-personalized stories, teacher dashboard, level-placement test (intentionally dropped).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Clerk proxy middleware in `artifacts/api-server` must stay mounted before body parsers (`express.json()`); moving it after breaks the proxy.
- When adding new frontend deps that touch Clerk/Tailwind, keep the `@tailwindcss/vite` plugin's `optimize: false` option if added later for Clerk compatibility.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
