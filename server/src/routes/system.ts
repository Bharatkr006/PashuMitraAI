import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadKnowledgeBase } from "../core/knowledge-retrieval.js";
import { isGroqKeyConfigured } from "../core/response-generator.js";
import { saveUserCorrection } from "../core/dialect-normalizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

function getSampleQuestionsPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "data/sample_questions.json"),
    path.resolve(__dirname, "../../data/sample_questions.json"),
    path.resolve(__dirname, "../../../data/sample_questions.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

router.get("/system/config", (req: Request, res: Response) => {
  try {
    const kb = loadKnowledgeBase();
    res.json({
      kb_size: kb.length,
      dialect_loaded: true,
      groq_configured: isGroqKeyConfigured(),
      emergency_rules: true,
      health_records: "SQLite local DB",
      node_version: process.version,
    });
  } catch (err: any) {
    console.error("Error fetching system config:", err);
    res.status(500).json({ error: "Failed to fetch system config" });
  }
});

router.get("/sample-questions", (req: Request, res: Response) => {
  try {
    const p = getSampleQuestionsPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      res.json(data);
      return;
    }

    // Default sample questions
    res.json([
      "मेरी गाय खाना नहीं खा रही है",
      "भैंस का पेट फूल गया है बहुत ज़्यादा",
      "गाय गिर गई है और उठ नहीं पा रही",
      "बकरी को दस्त हो रहे हैं",
      "जानवर ने कुछ ज़हरीला खा लिया लग रहा है",
      "आफरो आयो भैंस को",
      "मेरे जानवर को एमोक्सिसिलिन कितनी देनी चाहिए",
      "पशु को कौन सा टीका कब लगवाना चाहिए",
    ]);
  } catch (err: any) {
    console.error("Error fetching sample questions:", err);
    res.status(500).json({ error: "Failed to fetch sample questions" });
  }
});

router.post("/corrections", (req: Request, res: Response) => {
  try {
    const { original_term, corrected_term, consent } = req.body;
    if (!original_term || !corrected_term) {
      res.status(400).json({ error: "original_term and corrected_term are required" });
      return;
    }

    const result = saveUserCorrection(original_term, corrected_term, Boolean(consent));
    res.json(result);
  } catch (err: any) {
    console.error("Error saving correction:", err);
    res.status(500).json({ error: "Failed to save correction" });
  }
});

export default router;
