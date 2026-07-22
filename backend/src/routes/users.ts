import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { name: "asc" },
    });

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

export default router;
