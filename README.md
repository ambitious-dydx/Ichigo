# Ichigo

Ichigo is a context-first feedback product.

## What Exists Now

- a full-stack `Next.js` application with frontend pages, backend route handlers, persistent local storage, sessions, and seeded data
- product documentation in `Ichigo Project Development Documentation.pdf`
- early brand assets in `assets/logo/`
- current execution-state docs in `README.md` and `docs/mvp-gap-analysis.md`

## Product Thesis

- users share thoughts, questions, wins, or worries
- each post carries a response mode such as `Hype Me`, `Comfort Me`, `Advise Me`, `Soft Truth`, `Challenge Me`, or `Just Listen`
- the system rewards emotionally aligned responses instead of random feedback
- the core principle is: `a post is not just content. It is content plus context.`

## Current Positioning

Ichigo is currently positioned as a feedback product for:

- founders
- builders
- a narrow slice of creators

This is the current beta wedge.

Ichigo is not currently being positioned as a general social network.
Long-term expansion may happen later, but the current product should be read as a context-shaped feedback tool for work, decisions, drafts, launches, and high-signal conversation.

## Application Scope

The current application includes:

- landing page communicating the product thesis and beta wedge
- email/password registration and login
- Google sign-in
- email verification gating
- password reset and account recovery
- protected application routes
- onboarding before full app usage
- persistent feed, compose, thread, rooms, notifications, profile, settings, and moderation flows
- reply-mode assistance, classification, rewrite guidance, and cooldown enforcement
- local backend APIs aligned to the current implementation
- seeded data covering rooms, posts, comments, notifications, moderation records, and a demo account
- heuristic mode-alignment, rewrite, and mode-suggestion services as the current AI layer
- optional Gemini-powered second-pass fit checking for manual `Check fit` and rewrite refinement when `GEMINI_API_KEY` is configured

## Current State

Best current label:

- `late alpha`
- `closed beta candidate`

Not yet:

- `public MVP`
- `general social platform`

## Local Development

```bash
npm install
npm run dev
```

App URL:

```bash
http://localhost:3000
```

Production build:

```bash
npm run build
```

## Testing

Run the full test suite with:

```bash
npm test
```

This runs a production build first, then executes the automated `Vitest` suite against:

- security primitives such as password hashing and session token behavior
- response-mode classification and suggestion logic
- repository flows for users, posts, comments, rooms, ratings, notifications, and reports
- live HTTP integration for login, registration, account changes, password rotation, sessions, protected routes, and post creation

## Authentication

Ichigo now supports two real authentication paths:

- email + password registration and sign-in
- Google account sign-in

Password policy for new and changed passwords:

- `12` to `72` characters
- at least one uppercase letter
- at least one lowercase letter
- at least one number
- at least one symbol
- no spaces

To enable Google auth locally or in production, create `.env.local` from `.env.example` and provide:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

In Google Cloud, add these authorized redirect URIs for the OAuth client:

```text
http://localhost:3000/api/auth/google/callback
https://your-production-domain.com/api/auth/google/callback
```

## Transactional Email

Ichigo now supports production-style verification and password reset email delivery over SMTP.

Minimum Gmail setup:

```bash
APP_URL=http://localhost:3000
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-google-app-password
```

With only `SMTP_USER` and `SMTP_PASS`, Ichigo defaults to Gmail SMTP:

- host: `smtp.gmail.com`
- port: `465`
- secure: `true`
- from: `Ichigo <SMTP_USER>`

For non-Gmail providers or a branded sender, also set:

```bash
SMTP_HOST=...
SMTP_PORT=...
SMTP_SECURE=true
SMTP_FROM=Ichigo <noreply@your-domain.com>
```

Verification emails send a `6-digit code`.
Users enter that code at:

```text
/app/verify
```

Password reset emails link to:

```text
/reset-password?token=...
```

Verification code behavior:

- code expires after `30 minutes`
- only the newest active code remains valid after a resend
- new email registrations are routed straight to the verification screen

## Optional Gemini Fit Checking

To enable Gemini as a second-pass checker for reply fit and rewrite refinement:

```bash
GEMINI_API_KEY=...
```

Optional model override:

```bash
GEMINI_FIT_MODEL=gemini-2.5-flash-lite
```

## Demo Account

Use the seeded local account:

```text
email: nia@ichigo.local
password: Ichigo-demo1!
```

## Backend Surface

The backend is implemented inside the Next.js app using route handlers under `app/api/`.

Implemented route groups:

- `auth`
- `users`
- `posts`
- `comments`
- `rooms`
- `reports`
- `moderation`
- `ai`

This repository is the working source of truth for Ichigo and is synced to the private GitHub remote.
