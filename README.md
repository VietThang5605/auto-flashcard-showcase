# Auto Flashcard

Auto Flashcard is an AI-powered vocabulary learning app. Users enter an English word or phrase, choose an AI provider, and receive a structured flashcard with definitions, Vietnamese explanation, examples, pronunciation, image suggestions, and quiz questions.

Demo: https://auto-flashcard.vercel.app/

The project is built as a full-stack PWA with authentication, offline-first local storage, spaced repetition, push reminders, and Supabase synchronization.

> **Repository Note:** This repository is a cleaned public showcase version of the original development project. The commit history was reset so the public version only includes the current source code, documentation, and example environment configuration.

## Features

- AI flashcard generation with OpenAI or Google Gemini.
- Structured learning content: word type, phonetic spelling, English/Vietnamese definitions, examples, and quiz questions.
- Optional image enrichment with Unsplash or Pixabay.
- SM-2-based spaced repetition review flow.
- Quiz mode for generated multiple-choice questions.
- Decks, nested folders, tags, bookmarks, move/delete actions, and dashboard stats.
- Offline-first usage with IndexedDB/Dexie and a local sync queue.
- Supabase Auth, PostgreSQL schema migrations, and Row Level Security policies.
- PWA support with service worker caching and installable mobile/desktop experience.
- Web Push reminders triggered by a protected cron endpoint.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI, Framer Motion
- **Backend:** Next.js API Routes, Supabase Auth, Supabase PostgreSQL
- **AI:** OpenAI API, Google Gemini API
- **Offline/PWA:** IndexedDB, Dexie, Serwist, Service Worker
- **Notifications:** Web Push, VAPID, GitHub Actions schedule
- **Deployment:** Vercel

## Architecture Overview

```text
User
  -> Next.js UI
  -> /api/analyze
  -> OpenAI or Gemini
  -> optional image search
  -> flashcard preview
  -> local IndexedDB + Supabase sync
```

Key implementation areas:

- `src/app/api/analyze/route.js`: validates requests, checks authentication, calls the selected AI provider, and returns structured flashcard data.
- `src/lib/ai`: AI provider wrappers and prompt construction.
- `src/lib/db.js`: Dexie/IndexedDB local database.
- `src/lib/syncService.js`: offline-first sync between local data and Supabase.
- `src/hooks`: feature hooks for decks, flashcards, quiz, review, tags, and push notifications.
- `supabase/migrations`: database schema, RLS policies, spaced repetition function, push subscriptions, and offline-first fields.
- `.github/workflows/push-notify.yml`: scheduled notification trigger.

## Local Setup

Clone the repository and install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`, then start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Use `.env.example` as the template. Do not commit `.env.local` or any real credentials.

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client/server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client/server | Public Supabase anon key used with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for cron/push | Server only | Supabase service role key for admin server jobs |
| `OPENAI_API_KEY` | At least one AI provider | Server only | OpenAI key for flashcard generation |
| `GEMINI_API_KEY` | At least one AI provider | Server only | Gemini key for flashcard generation |
| `UNSPLASH_ACCESS_KEY` | Optional | Server only | Unsplash image search |
| `PIXABAY_API_KEY` | Optional | Server only | Pixabay image search |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Client/server | Public Web Push key |
| `VAPID_PRIVATE_KEY` | Optional | Server only | Private Web Push key |
| `VAPID_EMAIL` | Optional | Server only | Web Push contact email |
| `CRON_SECRET` | Optional but recommended | Server/GitHub Actions | Bearer token for `/api/cron/notify` |

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Copy the service role key into `.env.local` for server-only jobs.
4. Apply the SQL files in `supabase/migrations` in order.
5. Enable the authentication providers you want to use in Supabase Auth.
6. Confirm Row Level Security is enabled for user-owned tables.

The migrations include:

- flashcards, tags, decks, review logs, and progress tables
- RLS policies for per-user data access
- SM-2 review scheduling function
- push subscription and notification tracking tables
- offline-first sync metadata

## VAPID Keys for Push Notifications

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add the public/private keys to your environment:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@example.com
```

## Deploy to Vercel

1. Push this project to a clean GitHub repository.
2. Import the repository into Vercel.
3. Add all required environment variables in Vercel Project Settings.
4. Deploy the project.
5. After deployment, update Supabase Auth redirect URLs if needed.
6. Set the production app URL as a GitHub Actions secret if using scheduled notifications.

Recommended Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
GEMINI_API_KEY
UNSPLASH_ACCESS_KEY
PIXABAY_API_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
```

## Scheduled Notifications

The workflow in `.github/workflows/push-notify.yml` calls the notification endpoint on a schedule.

Add these GitHub repository secrets:

```text
VERCEL_APP_URL=https://your-vercel-app.vercel.app
CRON_SECRET=the-same-value-used-in-vercel
```

The endpoint is protected with:

```text
Authorization: Bearer <CRON_SECRET>
```

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Build the production app
npm run start    # Start the production server
npm run lint     # Run linting
```
