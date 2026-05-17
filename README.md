# Ichigo

Ichigo is an intentional feedback platform.

## What Exists Now

- a full-stack `Next.js` application with frontend pages, backend route handlers, persistent local storage, sessions, and seeded data
- product documentation in `Ichigo Project Development Documentation.pdf`
- early brand assets in `assets/logo/`

## Product Thesis

- users share thoughts, questions, wins, or worries
- each post carries a response mode such as `Hype Me`, `Comfort Me`, `Advise Me`, `Soft Truth`, `Challenge Me`, or `Just Listen`
- the system rewards emotionally aligned responses instead of random feedback
- the core principle is: `a post is not just content. It is content plus context.`

## Application Scope

The current application includes:

- landing page communicating the product thesis and context-first principle
- registration and login
- protected application routes
- persistent feed, posts, comments, ratings, rooms, notifications, profile, and moderation flows
- local backend APIs aligned to the documentation draft
- seeded data covering rooms, posts, comments, notifications, and moderation records
- heuristic mode-alignment and mode-suggestion services as the initial AI layer

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

## Demo Account

Use the seeded local account:

```text
email: nia@ichigo.local
password: ichigo-demo
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
