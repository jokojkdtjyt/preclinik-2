# PreClinik

An e-learning platform for Algerian medical students. Provides video lessons, five-option Q-banks, and progress tracking built around the Algerian medical curriculum.

## Stack

- **Frontend** (`artifacts/preclinik`): React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Wouter routing + TanStack Query
- **API Server** (`artifacts/api-server`): Express + Pino logging + Clerk auth middleware
- **Auth**: Replit-managed Clerk (provisioned automatically)
- **Database**: Replit PostgreSQL via Drizzle ORM (`lib/db`)
- **Video CDN**: Bunny.net (`BUNNY_API_KEY`)
- **Shared libs**: `lib/api-spec` (OpenAPI), `lib/api-client-react` (generated client), `lib/api-zod` (Zod schemas)

## Running

Workflows are pre-configured and start automatically:

| Workflow | Command |
|---|---|
| Frontend | `pnpm --filter @workspace/preclinik run dev` |
| API Server | `pnpm --filter @workspace/api-server run dev` |

## Environment Variables / Secrets

| Key | Notes |
|---|---|
| `CLERK_SECRET_KEY` | Auto-provisioned by Replit Clerk |
| `CLERK_PUBLISHABLE_KEY` | Auto-provisioned by Replit Clerk |
| `VITE_CLERK_PUBLISHABLE_KEY` | Auto-provisioned by Replit Clerk |
| `DATABASE_URL` | Auto-provisioned by Replit PostgreSQL |
| `BUNNY_API_KEY` | Your Bunny.net API key — needed for video upload/playback |
| `SESSION_SECRET` | Session signing secret |

## Database

Schema is managed via Drizzle ORM. To push schema changes to the dev database:

```bash
pnpm --filter @workspace/db run push
```

## User Preferences

- Keep existing project structure and stack — do not restructure or migrate
