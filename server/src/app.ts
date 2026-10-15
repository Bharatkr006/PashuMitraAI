import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import chatRouter from "./routes/chat.js";
import animalsRouter from "./routes/animals.js";
import metricsRouter from "./routes/metrics.js";
import systemRouter from "./routes/system.js";
import ttsRouter from "./routes/tts.js";
import transcribeRouter from "./routes/transcribe.js";
import authRouter from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));

  // Mount API routers
  app.use("/api/auth", authRouter);
  app.use("/api", authRouter);
  app.use("/api", chatRouter);
  app.use("/api", animalsRouter);
  app.use("/api", metricsRouter);
  app.use("/api", systemRouter);
  app.use("/api", ttsRouter);
  app.use("/api", transcribeRouter);

  // Serve static assets from public if present (built frontend)
  const publicPaths = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../public"),
    path.resolve(process.cwd(), "server/dist/public"),
  ];

  let publicDir = "";
  for (const p of publicPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
      publicDir = p;
      break;
    }
  }

  if (publicDir) {
    app.use(express.static(publicDir));

    // Client-side routing fallback
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(publicDir, "index.html"));
    });
  } else {
    app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "PashuMitra AI API is running. Build frontend to serve web UI.",
        endpoints: [
          "/api/auth/login",
          "/api/chat",
          "/api/animals",
          "/api/metrics",
          "/api/system/config",
        ],
      });
    });
  }

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled express error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
