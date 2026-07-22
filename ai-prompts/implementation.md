## Prompt 1 — Backend runnable skeleton
**Prompt:** This backend has prisma/schema.prisma already finalized and dependencies
installed (express, @prisma/client, zod, vitest, supertest, ts-node-dev, typescript).
Set up the runnable skeleton:
- Add/update npm scripts in package.json: "db:migrate" (prisma migrate dev),
  "db:generate" (prisma generate), "db:seed" (ts-node prisma/seed.ts),
  "dev" (ts-node-dev src/index.ts), "test" (vitest run)
- Create src/lib/prisma.ts exporting a PrismaClient singleton
- Create src/index.ts: minimal Express app on port 3000 with a GET /health endpoint
  returning { status: "ok" }
- Make sure .env has DATABASE_URL="file:./dev.db"
Don't build any routes, services, or seed data yet — just confirm the app boots and
can reach the database.

**AI Response Summary:** Added npm scripts, created src/lib/prisma.ts with a
PrismaClient singleton, created src/index.ts with Express app + /health endpoint,
confirmed .env DATABASE_URL. Ran npm install, prisma generate, and prisma migrate dev
--name init to create the initial migration and dev.db.

**Accepted:** Full skeleton as generated. Verified /health returns {"status":"ok"}
in browser, confirmed migration created dev.db.

**Changed:** AI added `dotenv` as a dependency, not explicitly requested — reasonable
addition since Express doesn't auto-load .env files and PrismaClient needs
DATABASE_URL available at runtime.

**Rejected:** N/A# Implementation
