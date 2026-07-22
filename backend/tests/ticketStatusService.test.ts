import { TicketStatus } from "@prisma/client";
import { describe, expect, test } from "vitest";
import {
  canTransition,
  getAllowedTransitions,
  isTerminal,
} from "../src/services/ticketStatusService";

function expectSameMembers(actual: TicketStatus[], expected: TicketStatus[]): void {
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected));
}

describe("canTransition", () => {
  describe("valid transitions", () => {
    test("allows OPEN -> IN_PROGRESS", () => {
      expect(canTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
    });

    test("allows OPEN -> CANCELLED", () => {
      expect(canTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);
    });

    test("allows IN_PROGRESS -> RESOLVED", () => {
      expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    });

    test("allows IN_PROGRESS -> CANCELLED", () => {
      expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
    });

    test("allows RESOLVED -> CLOSED", () => {
      expect(canTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    });
  });

  describe("rejected transitions — skip-ahead", () => {
    test("rejects OPEN -> RESOLVED (skip-ahead)", () => {
      expect(canTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(false);
    });

    test("rejects OPEN -> CLOSED (skip-ahead)", () => {
      expect(canTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
    });

    test("rejects IN_PROGRESS -> CLOSED (skip-ahead)", () => {
      expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
    });
  });

  describe("rejected transitions — backward/reopen", () => {
    test("rejects IN_PROGRESS -> OPEN (backward)", () => {
      expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.OPEN)).toBe(false);
    });

    test("rejects RESOLVED -> OPEN (reopen)", () => {
      expect(canTransition(TicketStatus.RESOLVED, TicketStatus.OPEN)).toBe(false);
    });

    test("rejects RESOLVED -> IN_PROGRESS (reopen)", () => {
      expect(canTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
    });
  });

  describe("rejected transitions — late cancel", () => {
    test("rejects RESOLVED -> CANCELLED (late cancel)", () => {
      expect(canTransition(TicketStatus.RESOLVED, TicketStatus.CANCELLED)).toBe(false);
    });
  });

  describe("rejected transitions — terminal outbound", () => {
    test("rejects CLOSED -> OPEN (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
    });

    test("rejects CLOSED -> IN_PROGRESS (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    test("rejects CLOSED -> RESOLVED (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
    });

    test("rejects CLOSED -> CANCELLED (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CLOSED, TicketStatus.CANCELLED)).toBe(false);
    });

    test("rejects CANCELLED -> OPEN (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CANCELLED, TicketStatus.OPEN)).toBe(false);
    });

    test("rejects CANCELLED -> IN_PROGRESS (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CANCELLED, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    test("rejects CANCELLED -> RESOLVED (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CANCELLED, TicketStatus.RESOLVED)).toBe(false);
    });

    test("rejects CANCELLED -> CLOSED (terminal outbound)", () => {
      expect(canTransition(TicketStatus.CANCELLED, TicketStatus.CLOSED)).toBe(false);
    });
  });

  describe("rejected transitions — same-state", () => {
    test("rejects OPEN -> OPEN (same-state)", () => {
      expect(canTransition(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
    });

    test("rejects IN_PROGRESS -> IN_PROGRESS (same-state)", () => {
      expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    test("rejects RESOLVED -> RESOLVED (same-state)", () => {
      expect(canTransition(TicketStatus.RESOLVED, TicketStatus.RESOLVED)).toBe(false);
    });

    test("rejects CLOSED -> CLOSED (same-state)", () => {
      expect(canTransition(TicketStatus.CLOSED, TicketStatus.CLOSED)).toBe(false);
    });

    test("rejects CANCELLED -> CANCELLED (same-state)", () => {
      expect(canTransition(TicketStatus.CANCELLED, TicketStatus.CANCELLED)).toBe(false);
    });
  });
});

describe("getAllowedTransitions", () => {
  test("returns IN_PROGRESS and CANCELLED from OPEN", () => {
    expectSameMembers(getAllowedTransitions(TicketStatus.OPEN), [
      TicketStatus.IN_PROGRESS,
      TicketStatus.CANCELLED,
    ]);
  });

  test("returns RESOLVED and CANCELLED from IN_PROGRESS", () => {
    expectSameMembers(getAllowedTransitions(TicketStatus.IN_PROGRESS), [
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ]);
  });

  test("returns CLOSED from RESOLVED", () => {
    expectSameMembers(getAllowedTransitions(TicketStatus.RESOLVED), [
      TicketStatus.CLOSED,
    ]);
  });

  test("returns empty array from CLOSED", () => {
    expect(getAllowedTransitions(TicketStatus.CLOSED)).toEqual([]);
  });

  test("returns empty array from CANCELLED", () => {
    expect(getAllowedTransitions(TicketStatus.CANCELLED)).toEqual([]);
  });
});

describe("isTerminal", () => {
  test("returns false for OPEN", () => {
    expect(isTerminal(TicketStatus.OPEN)).toBe(false);
  });

  test("returns false for IN_PROGRESS", () => {
    expect(isTerminal(TicketStatus.IN_PROGRESS)).toBe(false);
  });

  test("returns false for RESOLVED", () => {
    expect(isTerminal(TicketStatus.RESOLVED)).toBe(false);
  });

  test("returns true for CLOSED", () => {
    expect(isTerminal(TicketStatus.CLOSED)).toBe(true);
  });

  test("returns true for CANCELLED", () => {
    expect(isTerminal(TicketStatus.CANCELLED)).toBe(true);
  });
});
