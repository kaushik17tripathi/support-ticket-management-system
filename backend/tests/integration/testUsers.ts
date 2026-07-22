/**
 * Stable test user records seeded by `tests/integration/setup.ts`.
 * Import these IDs in integration tests — do not use `prisma/seed.ts` users.
 */
export const TEST_USERS = {
  agent: {
    id: "test_user_agent",
    name: "Test Agent",
    email: "agent@test.local",
    role: "agent",
  },
  admin: {
    id: "test_user_admin",
    name: "Test Admin",
    email: "admin@test.local",
    role: "admin",
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;
