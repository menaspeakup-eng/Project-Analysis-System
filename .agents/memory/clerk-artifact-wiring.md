---
name: Clerk auth wiring on react-vite artifacts
description: Gotchas when wiring Clerk (Replit-managed) into a pnpm-workspace react-vite artifact + Express api-server.
---

- On the server, `clerkProxyMiddleware()` must be mounted before `express.json()`/`express.urlencoded()`, and `clerkMiddleware(...)` (using `publishableKeyFromHost`) goes after CORS/body parsers but before the API router. Getting the order wrong breaks the Clerk proxy silently.
  **Why:** the proxy needs the raw request stream; body parsers consume it first if mounted earlier.
  **How to apply:** when adding Clerk to a new api-server, copy the canonical `app.ts` snippet from the `clerk-auth` skill verbatim rather than reordering existing middleware by feel.

- When delegating Clerk + landing-page frontend work to a design subagent, it produced an `App.tsx` that imports `@/lib/queryClient` but never created that file — the app crashed on first load with a Vite import-resolution error.
  **Why:** the subagent wired `QueryClientProvider` (a general react-query convention) without checking the file existed in this fresh scaffold.
  **How to apply:** after a design subagent finishes Clerk/query-client wiring, grep for `@/lib/queryClient` (or similar convention imports) and confirm the file exists before restarting the workflow; create it directly if missing rather than re-delegating.
