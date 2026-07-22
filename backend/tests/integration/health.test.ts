import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./testApp";
import { TEST_USERS } from "./testUsers";

describe("integration setup smoke", () => {
  it("returns seeded test users", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((user: { id: string }) => user.id)).toEqual(
      expect.arrayContaining([TEST_USERS.agent.id, TEST_USERS.admin.id]),
    );
  });
});
