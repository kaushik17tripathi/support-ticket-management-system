import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../src/lib/prisma";
import { TEST_USERS } from "./testUsers";

/**
 * Resets the isolated integration-test database before the suite runs.
 *
 * Wipes `prisma/test.db` and reapplies migrations via `migrate deploy` (equivalent
 * to a fresh reset for a dedicated test DB). Prisma 7 removed `--skip-seed` from
 * `migrate reset`; test users are seeded explicitly below, not via `prisma/seed.ts`.
 */
export async function setup(): Promise<void> {
  const backendRoot = path.resolve(__dirname, "../..");
  const testDbPath = path.join(backendRoot, "prisma", "test.db");

  for (const dbFile of [testDbPath, `${testDbPath}-journal`]) {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  }

  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  });

  for (const user of Object.values(TEST_USERS)) {
    await prisma.user.create({ data: user });
  }
}

export async function teardown(): Promise<void> {
  await prisma.$disconnect();
}
