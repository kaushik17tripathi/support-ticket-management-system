import { TicketStatus } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { app } from "./testApp";
import { TEST_USERS } from "./testUsers";

const ACTING_USER_ID = TEST_USERS.agent.id;

function withActingUser(req: request.Test): request.Test {
  return req.set("X-Acting-User-Id", ACTING_USER_ID);
}

async function createTicket(
  overrides: Record<string, unknown> = {},
): Promise<request.Response> {
  return withActingUser(request(app).post("/api/tickets")).send({
    title: "Login Issue",
    description: "User cannot log in with SSO",
    priority: "HIGH",
    ...overrides,
  });
}

async function transitionTicket(
  ticketId: string,
  status: TicketStatus,
  expectedStatus: TicketStatus,
): Promise<request.Response> {
  return withActingUser(request(app).patch(`/api/tickets/${ticketId}/status`)).send({
    status,
    expectedStatus,
  });
}

async function closeTicket(ticketId: string): Promise<void> {
  await transitionTicket(ticketId, TicketStatus.IN_PROGRESS, TicketStatus.OPEN);
  await transitionTicket(ticketId, TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS);
  await transitionTicket(ticketId, TicketStatus.CLOSED, TicketStatus.RESOLVED);
}

async function cancelTicket(ticketId: string): Promise<void> {
  await transitionTicket(ticketId, TicketStatus.CANCELLED, TicketStatus.OPEN);
}

beforeEach(async () => {
  await prisma.ticket.deleteMany();
});

describe("tickets API integration", () => {
  describe("state machine via API", () => {
    it("follows the happy path OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED with allowedStatuses at each step", async () => {
      const createResponse = await createTicket();
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.status).toBe(TicketStatus.OPEN);
      expect(createResponse.body.data.allowedStatuses).toEqual(
        expect.arrayContaining([TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED]),
      );

      const ticketId = createResponse.body.data.id;

      const inProgressResponse = await transitionTicket(
        ticketId,
        TicketStatus.IN_PROGRESS,
        TicketStatus.OPEN,
      );
      expect(inProgressResponse.status).toBe(200);
      expect(inProgressResponse.body.data.status).toBe(TicketStatus.IN_PROGRESS);
      expect(inProgressResponse.body.data.allowedStatuses).toEqual(
        expect.arrayContaining([TicketStatus.RESOLVED, TicketStatus.CANCELLED]),
      );

      const resolvedResponse = await transitionTicket(
        ticketId,
        TicketStatus.RESOLVED,
        TicketStatus.IN_PROGRESS,
      );
      expect(resolvedResponse.status).toBe(200);
      expect(resolvedResponse.body.data.status).toBe(TicketStatus.RESOLVED);
      expect(resolvedResponse.body.data.allowedStatuses).toEqual([TicketStatus.CLOSED]);

      const closedResponse = await transitionTicket(
        ticketId,
        TicketStatus.CLOSED,
        TicketStatus.RESOLVED,
      );
      expect(closedResponse.status).toBe(200);
      expect(closedResponse.body.data.status).toBe(TicketStatus.CLOSED);
      expect(closedResponse.body.data.allowedStatuses).toEqual([]);
    });

    it("rejects OPEN -> RESOLVED with 422 INVALID_STATUS_TRANSITION", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;

      const response = await transitionTicket(
        ticketId,
        TicketStatus.RESOLVED,
        TicketStatus.OPEN,
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("returns 422 TERMINAL_TICKET_READ_ONLY (not 409) when changing status on a CLOSED ticket with stale expectedStatus", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;
      await closeTicket(ticketId);

      const response = await transitionTicket(
        ticketId,
        TicketStatus.IN_PROGRESS,
        TicketStatus.OPEN,
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("TERMINAL_TICKET_READ_ONLY");
      expect(response.body.error.code).not.toBe("STATUS_CONFLICT");
    });

    it("returns 409 STATUS_CONFLICT when expectedStatus is stale on a non-terminal ticket", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;

      await transitionTicket(ticketId, TicketStatus.IN_PROGRESS, TicketStatus.OPEN);

      const response = await transitionTicket(
        ticketId,
        TicketStatus.RESOLVED,
        TicketStatus.OPEN,
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("STATUS_CONFLICT");
    });
  });

  describe("validation via API", () => {
    it("returns 400 VALIDATION_ERROR with field-level details when title is missing on create", async () => {
      const response = await withActingUser(request(app).post("/api/tickets")).send({
        description: "Missing title",
        priority: "HIGH",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: expect.stringContaining("title") }),
        ]),
      );
    });

    it("returns 400 VALIDATION_ERROR when assignedToId is an empty string on create", async () => {
      const response = await createTicket({ assignedToId: "" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "assignedToId" }),
        ]),
      );
    });

    it("returns 400 VALIDATION_ERROR when priority is invalid on create", async () => {
      const response = await createTicket({ priority: "URGENT" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 INVALID_ACTING_USER when X-Acting-User-Id is missing on a mutating request", async () => {
      const response = await request(app).post("/api/tickets").send({
        title: "No acting user",
        description: "Should fail",
        priority: "LOW",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_ACTING_USER");
    });
  });

  describe("terminal read-only via API", () => {
    it("returns 422 TERMINAL_TICKET_READ_ONLY when PATCHing fields on a CLOSED ticket", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;
      await closeTicket(ticketId);

      const response = await withActingUser(
        request(app).patch(`/api/tickets/${ticketId}`),
      ).send({ title: "Updated title" });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("TERMINAL_TICKET_READ_ONLY");
    });

    it("returns 422 TERMINAL_TICKET_READ_ONLY when POSTing a comment on a CANCELLED ticket", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;
      await cancelTicket(ticketId);

      const response = await withActingUser(
        request(app).post(`/api/tickets/${ticketId}/comments`),
      ).send({ message: "Should not be allowed" });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("TERMINAL_TICKET_READ_ONLY");
    });
  });

  describe("comments via API", () => {
    it("returns 201 and includes the new comment in GET ticket detail", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;

      const commentResponse = await withActingUser(
        request(app).post(`/api/tickets/${ticketId}/comments`),
      ).send({ message: "Reproduced on Chrome 125" });

      expect(commentResponse.status).toBe(201);
      expect(commentResponse.body.data.message).toBe("Reproduced on Chrome 125");
      expect(commentResponse.body.data.createdBy.id).toBe(ACTING_USER_ID);

      const detailResponse = await request(app).get(`/api/tickets/${ticketId}`);
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.comments).toHaveLength(1);
      expect(detailResponse.body.data.comments[0].id).toBe(commentResponse.body.data.id);
      expect(detailResponse.body.data.comments[0].message).toBe("Reproduced on Chrome 125");
    });

    it("returns 400 VALIDATION_ERROR when comment message is empty", async () => {
      const createResponse = await createTicket();
      const ticketId = createResponse.body.data.id;

      const response = await withActingUser(
        request(app).post(`/api/tickets/${ticketId}/comments`),
      ).send({ message: "   " });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("search and filter via API", () => {
    it("matches tickets case-insensitively by title", async () => {
      await createTicket({ title: "Login Issue", description: "SSO failure" });
      await createTicket({ title: "Billing", description: "Unrelated" });

      const response = await request(app).get("/api/tickets").query({ search: "login" });

      expect(response.status).toBe(200);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.data[0].title).toBe("Login Issue");
    });

    it("treats %, _, and backslash in search as literals (LIKE escaping)", async () => {
      const backslashTitle = "path\\to\\file";

      await createTicket({ title: "100% done", description: "percent literal" });
      await createTicket({ title: "100X done", description: "no percent" });
      await createTicket({ title: "under_score", description: "underscore literal" });
      await createTicket({ title: "underXscore", description: "no underscore" });
      await createTicket({ title: backslashTitle, description: "backslash literal" });

      const percentResponse = await request(app).get("/api/tickets").query({ search: "%" });
      expect(percentResponse.status).toBe(200);
      expect(percentResponse.body.meta.count).toBe(1);
      expect(percentResponse.body.data[0].title).toBe("100% done");

      const underscoreResponse = await request(app).get("/api/tickets").query({ search: "_" });
      expect(underscoreResponse.status).toBe(200);
      expect(underscoreResponse.body.meta.count).toBe(1);
      expect(underscoreResponse.body.data[0].title).toBe("under_score");

      const backslashResponse = await request(app)
        .get("/api/tickets")
        .query({ search: "\\" });
      expect(backslashResponse.status).toBe(200);
      expect(backslashResponse.body.meta.count).toBe(1);
      expect(backslashResponse.body.data[0].title).toBe(backslashTitle);
    });

    it("combines status filter with search", async () => {
      const openMatch = await createTicket({
        title: "Login Issue Open",
        description: "open login",
      });
      await transitionTicket(
        openMatch.body.data.id,
        TicketStatus.IN_PROGRESS,
        TicketStatus.OPEN,
      );

      await createTicket({ title: "Login Issue Closed", description: "closed login" });
      const closedTicket = (
        await request(app).get("/api/tickets").query({ search: "Login Issue Closed" })
      ).body.data[0];
      await closeTicket(closedTicket.id);

      const response = await request(app).get("/api/tickets").query({
        search: "login",
        status: TicketStatus.IN_PROGRESS,
      });

      expect(response.status).toBe(200);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.data[0].title).toBe("Login Issue Open");
      expect(response.body.data[0].status).toBe(TicketStatus.IN_PROGRESS);
    });

    it("returns all tickets when search query is empty, subject to status filter", async () => {
      await createTicket({ title: "Alpha", description: "first" });
      const second = await createTicket({ title: "Beta", description: "second" });
      await transitionTicket(second.body.data.id, TicketStatus.IN_PROGRESS, TicketStatus.OPEN);

      const allResponse = await request(app).get("/api/tickets").query({ search: "" });
      expect(allResponse.status).toBe(200);
      expect(allResponse.body.meta.count).toBe(2);

      const filteredResponse = await request(app)
        .get("/api/tickets")
        .query({ search: "", status: TicketStatus.OPEN });
      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.meta.count).toBe(1);
      expect(filteredResponse.body.data[0].status).toBe(TicketStatus.OPEN);
    });
  });
});
