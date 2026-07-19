# PreClinik

A learning platform with a React frontend, Express API backend, and Clerk authentication.

## Project Structure

This is a **pnpm monorepo** with the following artifacts:

| Artifact | Path | Purpose |
|---|---|---|
| PreClinik (web) | `artifacts/preclinik/` | React + Vite frontend |
| API Server | `artifacts/api-server/` | Express.js REST API |
| Mockup Sandbox | `artifacts/mockup-sandbox/` | Design/component preview tool |

### Shared Libraries (`lib/`)

- **`lib/api-spec/`** — OpenAPI YAML spec + Orval config for code generation
- **`lib/api-zod/`** — Zod schemas shared between frontend and backend
- **`lib/api-client-react/`** — Generated TanStack Query hooks for the frontend
- **`lib/db/`** — Drizzle ORM schema and database client

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix), TanStack Query, Wouter, Framer Motion
- **Backend**: Express 5, Drizzle ORM, Pino logging
- **Auth**: Clerk (frontend `@clerk/react`, backend `@clerk/express`)
- **Database**: PostgreSQL via Drizzle ORM

## Running Locally

### Prerequisites

Before running, you'll need:

1. **Clerk keys** — `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your Clerk dashboard
2. **Database** — a `DATABASE_URL` (PostgreSQL connection string)

### Commands

```bash
# Install dependencies
pnpm install

# Run the frontend (dev server on PORT env var)
pnpm --filter @workspace/preclinik run dev

# Run the API server (dev server on PORT env var)
pnpm --filter @workspace/api-server run dev

# Typecheck the whole workspace
pnpm run typecheck
```

## User Preferences

<!-- Record any preferences the user asks you to remember here -->
