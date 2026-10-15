import { Router, Request, Response } from "express";
import { Groq, toFile } from "groq-sdk";

const router = Router();

router.post("/transcribe", async (req: Request, res: Response) => {
  try {
    const { audio, mimeType = "audio/webm", language = "hi" } = req.body;
    if (!audio || typeof audio !== "string") {
      res.status(400).json({ error: "Audio data (base64) is required" });
      return;
    }

    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      res.status(503).json({ error: "Groq API key not configured for transcription" });
      return;
    }

    const cleanBase64 = audio.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (buffer.length === 0) {
      res.status(400).json({ error: "Empty audio buffer" });
      return;
    }

    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("wav") ? "wav" : "webm";
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });

    const client = new Groq({ apiKey });
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: language === "en-IN" ? "en" : "hi",
      temperature: 0.0,
      response_format: "json",
    });

    const text = transcription.text ? transcription.text.trim() : "";
    console.info("[transcribe] Transcription success:", { chars: text.length, text });

    res.json({
      text,
      language,
    });
  } catch (err: any) {
    console.error("[transcribe] Error during audio transcription:", err?.message || err);
    res.status(500).json({
      error: "Transcription failed",
      message: err?.message || "Unknown error",
    });
  }
});

export default router;
