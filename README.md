# Support Ticket Management System

A full-stack support ticket tracker for the AI Capability Exercise (Core). Internal users create tickets, search and filter them, update fields, progress tickets through an enforced lifecycle, and add comments.

> **Repository layout:** This project uses `backend/` and `frontend/` at the root (not a single top-level `src/`). See [design-notes.md](./design-notes.md) for rationale.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript, Prisma 7, SQLite, Zod |
| Frontend | React, Vite, TypeScript *(in progress)* |
| Tests | Vitest, Supertest |

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm 10+**
- Git

## Quick start (backend)

```bash
git clone <repository-url>
cd support-ticket-management-system/backend

npm install
cp .env.example .env          # Unix — or: copy .env.example .env on Windows

npm run db:generate
npm run db:migrate
npm run db:seed

npm run dev
```

The API listens on **http://localhost:3000**.

Verify:

```bash
curl http://localhost:3000/health
# {"status":"ok"}

curl http://localhost:3000/api/users
# 5 seeded users for the acting-user dropdown
```

## Frontend

The React + Vite frontend is under `frontend/` and will be added in a subsequent milestone. Once available:

```bash
cd frontend
npm install
npm run dev
```

Until then, use the API directly (curl, Postman, etc.) or the integration tests as proof of backend behaviour.

## Environment variables

Copy `backend/.env.example` to `backend/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `file:./prisma/dev.db` | SQLite database file |
| `PORT` | No | `3000` | API server port |

No secrets are required for Core (no authentication).

## Database

- **Dev DB:** `backend/prisma/dev.db` — created by migrate + seed (not committed)
- **Test DB:** `backend/prisma/test.db` — ephemeral, managed by integration tests

Detailed instructions: [database/setup-notes.md](./database/setup-notes.md)  
Seed data overview: [database/seed-data/README.md](./database/seed-data/README.md)

## npm scripts (backend)

Run from `backend/`:

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start API with hot reload (`http://localhost:3000`) |
| `npm test` | Unit tests (state machine) |
| `npm run test:integration` | API integration tests (Supertest, isolated test DB) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply migrations to dev database |
| `npm run db:seed` | Upsert dev sample data (5 users, 10 tickets, 6 comments) |

## API overview

Base URL: `http://localhost:3000/api`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `GET` | `/users` | List seeded users (acting-user dropdown) |
| `GET` | `/tickets` | List tickets (`?search=`, `?status=`) |
| `POST` | `/tickets` | Create ticket |
| `GET` | `/tickets/:id` | Ticket detail + comments |
| `PATCH` | `/tickets/:id` | Update fields |
| `PATCH` | `/tickets/:id/status` | Status transition |
| `POST` | `/tickets/:id/comments` | Add comment |

Mutating requests require header: `X-Acting-User-Id: <user-id>` (a seeded user ID).

Full contract: [api-contract.md](./api-contract.md)

### Example: create a ticket

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "X-Acting-User-Id: user_james_chen" \
  -d '{"title":"Test ticket","description":"From curl","priority":"MEDIUM"}'
```

## Acting user (no authentication)

Core uses a demo acting-user pattern instead of login:

1. Call `GET /api/users` to list seeded users.
2. Pick a user ID (e.g. `user_priya_sharma`).
3. Send `X-Acting-User-Id` on every `POST` / `PATCH` request.

The frontend will persist the selection in `localStorage` (see [ui-flow.md](./ui-flow.md)).

## Tests

```bash
cd backend
npm test                  # 35 unit tests — state machine
npm run test:integration  # 17 integration tests — API via Supertest
```

Integration tests use a separate `test.db` and fixed test users — not dev seed data.

## Project documentation

| Document | Contents |
|----------|----------|
| [requirements-analysis.md](./requirements-analysis.md) | Requirements and assumptions |
| [acceptance-criteria.md](./acceptance-criteria.md) | Core checklist |
| [api-contract.md](./api-contract.md) | REST API, errors, check orders |
| [data-model.md](./data-model.md) | Prisma schema and ERD |
| [ui-flow.md](./ui-flow.md) | Frontend screens and flows |
| [design-notes.md](./design-notes.md) | Architecture synthesis |
| [implementation-plan.md](./implementation-plan.md) | Task breakdown |
| [ai-prompts/](./ai-prompts/) | Prompt history by lifecycle phase |

## Current status

- [x] Backend API (tickets, comments, users, search/filter)
- [x] State machine with integration tests
- [x] Dev database seed data
- [ ] Frontend (React + Vite)
- [ ] End-to-end manual test via UI

## License

Assessment exercise — internal use.
