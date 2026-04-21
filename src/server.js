import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import contentRoutes from "./routes/content.js";
import { initDatabase } from "./config/db.js";

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes("*") || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origem não permitida pelo CORS"));
    }
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/content", contentRoutes);

const port = process.env.PORT || 4000;

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`API ativa em http://localhost:${port} (PostgreSQL)`);
    });
  })
  .catch((error) => {
    console.error("Falha ao iniciar API:", error.message);
    process.exit(1);
  });
