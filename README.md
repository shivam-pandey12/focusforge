# FocusForge

FocusForge is a Next.js student planning and study-execution app using Firebase/Firestore and Razorpay-ready billing.

## Production Status

The app is ready to host with payments in activation-waiting mode.

- Starter/free app access can run now.
- Paid checkout is intentionally disabled until Razorpay live activation is available.
- Contact/support email: `mhhorizonhub@gmail.com`.
- Razorpay checkout can be enabled later without changing the UI flow.

## Local Setup

```bash
npm install
npm run dev
```

## Production Checks

Run these before deploying or pushing a release branch:

```bash
npm run lint
npm run build
```

If OneDrive leaves a stale Next.js build cache, remove only `.next` and rerun `npm run build`.

## Required Environment Variables

Create hosting environment variables from `.env.example`.

Required for Firebase client app:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Required for server-side Firebase/Admin APIs:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `ADMIN_EMAILS`

Support/contact:

- `NEXT_PUBLIC_SUPPORT_EMAIL=mhhorizonhub@gmail.com`

Payments before Razorpay live keys:

- `NEXT_PUBLIC_PAYMENTS_ACTIVE=false`

When Razorpay live keys are ready:

- `NEXT_PUBLIC_PAYMENTS_ACTIVE=true`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...`
- `RAZORPAY_KEY_ID=rzp_live_...`
- `RAZORPAY_KEY_SECRET=...`
- `RAZORPAY_WEBHOOK_SECRET=...`
- `RAZORPAY_CHECKOUT_CONFIG_ID=...` if using a Razorpay checkout display configuration

## Deployment Notes

- Do not commit `.env.local`, Firebase service-account JSON, or Razorpay secrets.
- Deploy Firestore rules and indexes from `firestore.rules` and `firestore.indexes.json`.
- Keep Razorpay webhooks pointed to `/api/billing/webhook` after live activation.
- Leave `NEXT_PUBLIC_PAYMENTS_ACTIVE=false` until live payment verification has been tested.

## Git Push Safety

The repository ignores `.env.local`, `.next`, `node_modules`, Firebase credentials, TypeScript build cache, and local logs. Review `git status` before pushing so generated files or secrets do not enter GitHub.
