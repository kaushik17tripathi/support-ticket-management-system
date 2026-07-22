import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
