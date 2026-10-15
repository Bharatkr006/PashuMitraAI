import { Router, Request, Response } from "express";
import { getSessionStats, recordSpeech } from "../core/metrics.js";

const router = Router();

router.get("/metrics", (req: Request, res: Response) => {
  try {
    const stats = getSessionStats();
    res.json(stats);
  } catch (err: any) {
    console.error("Error fetching metrics:", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

router.post("/metrics/speech", (req: Request, res: Response) => {
  try {
    const { success } = req.body;
    recordSpeech(Boolean(success));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error recording speech metric:", err);
    res.status(500).json({ error: "Failed to record speech metric" });
  }
});

export default router;
