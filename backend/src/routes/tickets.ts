import { Router } from "express";
import { actingUser } from "../middleware/actingUser";
import { validateBody, validateQuery } from "../middleware/validate";
import * as commentService from "../services/commentService";
import * as ticketService from "../services/ticketService";
import {
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  transitionStatusSchema,
  updateTicketSchema,
} from "../validation/ticketValidation";

const router = Router();

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/", validateQuery(listTicketsQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as unknown as {
      search?: string;
      status?: Parameters<typeof ticketService.list>[0]["status"];
    };

    const result = await ticketService.list({
      search: query.search,
      status: query.status,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  actingUser,
  validateBody(createTicketSchema),
  async (req, res, next) => {
    try {
      const body = req.body as Parameters<typeof ticketService.create>[0];

      const ticket = await ticketService.create({
        title: body.title,
        description: body.description,
        priority: body.priority,
        assignedToId: body.assignedToId,
        createdById: req.actingUserId,
      });

      res.status(201).json({ data: ticket });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const ticket = await ticketService.getById(routeParam(req.params.id));
    res.json({ data: ticket });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id",
  actingUser,
  validateBody(updateTicketSchema),
  async (req, res, next) => {
    try {
      const body = req.body as Parameters<typeof ticketService.updateFields>[1];

      const ticket = await ticketService.updateFields(routeParam(req.params.id), body);
      res.json({ data: ticket });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/status",
  actingUser,
  validateBody(transitionStatusSchema),
  async (req, res, next) => {
    try {
      const { status, expectedStatus } = req.body as {
        status: Parameters<typeof ticketService.transitionStatus>[1];
        expectedStatus: Parameters<typeof ticketService.transitionStatus>[2];
      };

      const ticket = await ticketService.transitionStatus(
        routeParam(req.params.id),
        status,
        expectedStatus,
      );

      res.json({ data: ticket });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/comments",
  actingUser,
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const { message } = req.body as { message: string };

      const comment = await commentService.create(
        routeParam(req.params.id),
        message,
        req.actingUserId,
      );

      res.status(201).json({ data: comment });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
