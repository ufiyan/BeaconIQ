# BeaconIQ — PRD & Working Notes

## Original problem statement
> https://github.com/ufiyan/BeaconIQ.git — connect to the GitHub repo, audit
> the underlying SaaS implementation, and debug for any issues or bugs.

User asked for:
- Full end-to-end audit + fix runtime errors that prevent the app from starting.
- Use Emergent universal LLM key where applicable.
- Repo cloned into `/app` (already there on session start).

## Architecture
- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui + Radix at `/app/src`.
  Marketing site, dashboard, leads/campaigns/email pipelines, settings.
- **Backend (this container)**: Tiny FastAPI proxy at `/app/backend/server.py`
  that forwards `/api/*` to `https://base44.app/api/*`. Required because:
  - The Base44 SDK makes relative `/api/...` calls.
  - In `vite dev`, the Vite plugin proxies these directly to Base44.
  - In the Emergent preview ingress, `/api/*` is routed to port 8001, so we
    need a server there that re-proxies to Base44.
- **Real backend**: Base44 (BaaS) at `https://beaconiq.base44.app` hosts the
  database, auth, entity APIs, and the Deno serverless functions defined in
  `/app/base44/functions/*`.

## Tech stack details
- App ID (Base44): `69ceddc3e8db99cfbe0e3b39`
- App slug URL: `https://beaconiq.base44.app`
- Frontend env: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`,
  `VITE_BASE44_API_KEY`, `VITE_GOOGLE_CLIENT_ID` in `/app/.env.local`.
- Supervisor mapping: `/app/frontend/package.json` is a shim whose `start`
  script `cd /app && exec yarn start` so the existing supervisor frontend
  program runs the Vite app at the repo root. Backend is a real FastAPI app
  in `/app/backend`.

## What's been implemented (Jan 2026 — initial debug session)
| # | Bug | Fix |
|---|-----|-----|
| 1 | Missing `.env.local` (app inert) | Created with provided creds |
| 2 | `navigateToLogin()` called during render in `App.jsx` (2 spots) | Wrapped in `useEffect` via `RequireAuthRedirect` / `AuthRequiredRedirect` |
| 3 | `Onboarding.handleFinish` redirected to `/` (Landing) | Changed to `/app` |
| 4 | `ProtectedRoute.jsx` was dead/broken (uses fields not in AuthContext) | Deleted |
| 5 | Double workspace bootstrap race (`AuthContext` + `WorkspaceContext`) | Removed from `AuthContext`; `WorkspaceContext` is the single source of truth |
| 6 | Sidebar pending badge filtered by `created_by` instead of `workspace_id` | Switched to `workspace_id` from `useWorkspace()` |
| 7 | `Settings.jsx` cross-workspace `created_by` fallback for BusinessProfile | Removed; only loads when workspace exists |
| 8 | `base44Client.js` had bogus `serverUrl: ''` and misleading "auth required" comment | Cleaned up + added `api_key` header from env |
| 9 | `connectGmail` silently fell back to a hardcoded `app.base44.com` redirect URI | Now requires explicit `redirect_uri` in body |
| 10 | `WorkspaceOnboardingModal` leaked `onMessage` listener if user closed modal mid-OAuth | Listener stored in ref + cleaned up on unmount and `stopPolling()` |
| 11 | 7 unused-import lint errors | Removed |
| 12 | No `/api` proxy through Emergent ingress | Added FastAPI proxy in `/app/backend/server.py` |

Plus build infrastructure:
- Added `start` script to root `package.json`.
- Created `/app/frontend` shim directory so the read-only supervisor config can launch Vite from the repo root.
- Configured Vite `server.allowedHosts: true` so the preview hostname is accepted.
- Installed `fastapi`, `uvicorn`, `httpx`; froze to `requirements.txt`.

## Current status
- Build passes (`yarn build`).
- Lint clean (`yarn lint`).
- Frontend running on port 3000, backend proxy on port 8001.
- Landing page renders with zero console errors.
- `/api/health` returns 200, `/api/apps/public/...` proxies to Base44 successfully.

## Known limitations / out of scope
- Authenticated flows (login, dashboard, leads, campaigns, OAuth) require the
  user to actually log in via Base44's hosted login. We can render the
  dashboard structure but cannot sign in without a real Base44 user account.
- Gmail OAuth requires the redirect URI
  `https://ce575c72-9c35-4df0-aa04-7bff24f34586.preview.emergentagent.com/oauth/callback`
  to be added to Google Cloud Console OAuth client. Otherwise the consent
  screen will reject.
- Lead RLS is keyed on `created_by: {{user.email}}` server-side while the
  client filters by `workspace_id`. Functions running `asServiceRole` bypass
  RLS — security model is "consistent enough" but not enforced everywhere.

## Next action items (P1 backlog, not blocking)
- ✅ DONE: Lead RLS reconciled — `workspace_id` is now `required` on Lead and 11 other workspace-scoped entities (BusinessProfile, Campaign, EmailIngestionLog, EmailIngestionSettings, EmailLog, ErrorLog, FollowUpReminder, IdealCustomerProfile, IntentScore, Prospect, ProspectContact, ProspectSignal). RLS read/update/delete remain `created_by`-based for per-user isolation; `workspace_id` is now non-skippable for tenant tagging.
- ✅ DONE: `aiClient` (`/app/base44/functions/aiClient/entry.ts` and the duplicated copy inside `gmailSync/entry.ts`) now defaults to `gpt-4o-mini` and uses OpenAI's strict `response_format: json_schema` instead of `json_object` + prompt-injected schema.
- ✅ DONE: `/app/public/manifest.json` created and serves 200 from both local and preview ingress.
- ✅ DONE (Jan 2026 #2): React Router v6 → v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`) — silenced deprecation warnings.
- ✅ DONE (Jan 2026 #2): Live Stripe Checkout wired up. `/app/backend/server.py` exposes:
  - `POST /api/payments/checkout/session` — creates a Stripe-hosted session for `package_id` ∈ {starter, pro}; price defined server-side only.
  - `GET /api/payments/checkout/status/{session_id}` — reads from Mongo (Emergent test proxy doesn't support Session.retrieve; webhook is source of truth).
  - `POST /api/webhook/stripe` — handles signed webhook, updates `payment_status` + flips `status` to `complete` on `checkout.session.completed`.
  - Frontend `PricingSection.jsx` CTAs redirect via `window.location.href` to Stripe; `StripeReturnHandler.jsx` toasts on return.
  - Mongo collection `beaconiq.payment_transactions` persists every checkout attempt.
  - Backend regression test suite at `/app/backend/tests/test_stripe_payments.py` (10/10 passing in iteration 2).
- ✅ DONE (Jan 2026 #2): `runProspectDiscovery` feature removed entirely. Deleted entities (`Prospect`, `ProspectContact`, `ProspectSignal`, `DiscoveryRun`, `IdealCustomerProfile`), Deno functions (`runProspectDiscovery`, `convertProspectToLead`, `generateProspectOutreach`), the entire `src/components/prospect/` directory, and updated `About.jsx` marketing copy.
- ✅ DONE (Jan 2026 #2): Base44 transparent proxy in `/app/backend/server.py` now forces `Accept-Encoding: identity` upstream so brotli/zstd-encoded responses never leak through (httpx didn't have those codecs installed; the previous proxy was returning compressed garbage when the client requested compression).
- USER ACTION: Add `https://ce575c72-9c35-4df0-aa04-7bff24f34586.preview.emergentagent.com/oauth/callback` to your Google Cloud OAuth client's authorized redirect URIs so Gmail connect works in this preview.
- USER ACTION: Push the Base44 entity + function changes (in `/app/base44/`) to your Base44 app so the new RLS rules and AI client take effect server-side.
- USER ACTION (when going to real production with a real Stripe account): set `STRIPE_API_KEY` to a real `sk_live_...` (or `sk_test_...`) and configure the webhook URL in your Stripe dashboard to point at `https://<domain>/api/webhook/stripe` — then `stripe.checkout.Session.retrieve()` will work and you can simplify `get_checkout_status` if you want.
- P2: Migrate FastAPI `@app.on_event` to the new lifespan context API (cosmetic).
