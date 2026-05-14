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

## Demo Account

Use the seeded local account:

```text
email: daniel@ichigo.local
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
