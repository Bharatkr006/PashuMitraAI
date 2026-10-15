import { Router, Request, Response } from "express";

const router = Router();

function cleanTextForSpeech(rawText: string): string {
  return rawText
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // Remove technical JSON / markdown keys
    .replace(/^\s*(?:response_(?:source|mode|path|path_reason|text)|llm_[\w]+|kb_[\w]+|sources|limitations|cannot_determine)\s*:\s*.*$/gim, " ")
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:www\.)\S+/gi, " ")
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Remove emoji and warning symbols
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
      ""
    )
    // Remove markdown formatting characters
    .replace(/[*#_`~>[\]]/g, "")
    // Normalize dashes and bullets
    .replace(/^[-•]\s*/gm, "")
    // Replace multiple spaces and newlines
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoChunks(text: string, maxChunkLength = 170): string[] {
  const sentences = text.match(/[^।?!.\n]+[।?!.\n]?/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).trim().length <= maxChunkLength) {
      current = (current + " " + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= maxChunkLength) {
        current = trimmed;
      } else {
        // If a single sentence is very long, split by comma or words
        const words = trimmed.split(/\s+/);
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).trim().length <= maxChunkLength) {
            sub = (sub + " " + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

router.get("/tts", async (req: Request, res: Response) => {
  try {
    const rawText = String(req.query.text || "").trim();
    const lang = String(req.query.lang || "hi").trim();

    if (!rawText) {
      res.status(400).json({ error: "Text parameter is required" });
      return;
    }

    const cleaned = cleanTextForSpeech(rawText);
    if (!cleaned) {
      res.status(400).json({ error: "No readable speech content found" });
      return;
    }

    const chunks = splitIntoChunks(cleaned);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
        lang === "rajasthani" ? "hi" : lang
      )}&client=tw-ob&q=${encodeURIComponent(chunk)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Google TTS returned status ${response.status}`);
      }

      const arrayBuf = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuf));
    }

    const finalBuffer = Buffer.concat(audioBuffers);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(finalBuffer);
  } catch (err: any) {
    console.error("[tts] TTS generation failed:", err?.message || err);
    res.status(503).json({ error: "TTS service currently unavailable" });
  }
});

export default router;
