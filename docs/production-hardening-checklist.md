# FocusForge Production Hardening Checklist

Use this checklist before larger public launches. Keep tests non-destructive and avoid production user data.

## Firebase And Firestore

- Deploy `firestore.rules` and `firestore.indexes.json` together before testing optimized range queries.
- In Firebase Usage, watch document reads, writes, active listeners, rejected reads, and index build errors during normal app navigation.
- Verify analytics, calendar, heatmap, weak areas, exports, notes, mock tests, journal, goals, reviews, reminders, and billing payments do not show missing-index errors.
- Confirm expensive exports are user-click initiated and do not load broad histories when Settings first renders.

## Next.js And API Routes

- Check route latency for `/dashboard`, `/analytics`, `/calendar`, `/heatmap`, `/settings`, `/settings/billing`, and `/pricing`.
- Verify billing routes return structured `429` responses after rapid repeated calls:
  - `/api/billing/create-order`
  - `/api/billing/verify-payment`
  - `/api/billing/refresh-status`
  - `/api/billing/dev-switch-plan` in development only
- Confirm API logs include route, status, duration, setup/rate-limit flags, and hashed user id only.
- Confirm logs never include Firebase ID tokens, Razorpay signatures, secrets, emails, profile images, note text, task titles, request bodies, or raw webhook payloads.

## Billing And Webhooks

- Use Razorpay sandbox/Test Mode for checkout verification before switching live keys.
- In Razorpay Dashboard, verify webhook delivery for `payment.captured` and `payment.failed`.
- Confirm duplicate webhook deliveries are idempotent and do not duplicate plan activation.
- Confirm payment verification failure copy tells the user to contact support with the payment ID.

## PWA And Cache

- Verify first load online, reload online, then offline route shell behavior for dashboard, focus, notes, calendar, analytics, and settings.
- Confirm `public/offline.html` renders in a calm branded state when navigation cannot be served.
- After deployment, hard refresh once to replace older service-worker caches.

## Non-Destructive Load Test Recipe

- Do not run destructive load tests against production data.
- Use a staging Firebase project and disposable test account.
- Test public/static routes separately from authenticated app routes.
- Keep write tests tiny: create and clean up a small number of disposable tasks/notes/reminders.
- Suggested smoke targets:
  - 20-50 concurrent public homepage requests.
  - 10-25 concurrent authenticated route-shell requests using cached data.
  - 5-10 repeated billing create-order attempts to confirm rate limiting.
- Stop immediately if Firebase usage, API latency, or error rates spike unexpectedly.
