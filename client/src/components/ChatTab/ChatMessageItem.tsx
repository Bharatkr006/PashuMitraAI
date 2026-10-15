import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, BookmarkPlus, Zap, Database } from "lucide-react";
import { ChatMessage } from "../../types";
import { useApp } from "../../context/AppContext";
import { UrgencyCard } from "./UrgencyCard";
import { EvidencePanel } from "./EvidencePanel";
import { SaveConsultationModal } from "./SaveConsultationModal";

function parseInlineFormatting(text: string): React.ReactNode[] {
  // Split on **bold text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "ul") {
        elements.push(
          <ul key={elements.length} className="list-disc pl-5 space-y-1.5 my-2 text-slate-700">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="leading-relaxed">{it}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={elements.length} className="list-decimal pl-5 space-y-1.5 my-2 text-slate-700">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="leading-relaxed">{it}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Bullet item (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(parseInlineFormatting(itemText));
      return;
    }

    // Numbered item (1. 2. etc)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+[.)]\s+/, "");
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(parseInlineFormatting(itemText));
      return;
    }

    flushList();

    // Bold section heading line: e.g. **क्या हो सकता है?** or **सुरक्षित अगला कदम**
    if (/^\*\*(.+?)\*\*[:?]?$/.test(trimmed)) {
      const headingText = trimmed.replace(/^\*\*/, "").replace(/\*\*[:?]?$/, "");
      elements.push(
        <h4
          key={index}
          className="font-bold text-slate-900 text-sm sm:text-base mt-3 mb-1.5 flex items-center gap-2 text-emerald-950"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
          <span>{headingText}</span>
        </h4>
      );
      return;
    }

    // Regular paragraph with inline formatting
    elements.push(
      <p key={index} className="text-slate-700 leading-relaxed my-1">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
};

interface ChatMessageItemProps {
  message: ChatMessage;
  userQuery?: string;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, userQuery = "" }) => {
  const isUser = message.role === "user";
  const { speechRate, activeSpeechMessageId, setActiveSpeechMessageId } = useApp();
  const isPlaying = activeSpeechMessageId === message.id;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
    };
  }, [message.id, setActiveSpeechMessageId]);

  const fallbackToBrowserSpeech = (cleanText: string) => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("आपके डिवाइस में आवाज़ सुनाने की सुविधा उपलब्ध नहीं है।");
      setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
      return;
    }

    const hindiCharacterCount = (cleanText.match(/[\u0900-\u097f]/g) || []).length;
    const englishCharacterCount = (cleanText.match(/[a-z]/gi) || []).length;
    const language = hindiCharacterCount >= englishCharacterCount ? "hi-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().includes("hi") ||
          v.name.toLowerCase().includes("hindi") ||
          v.name.includes("हिन्दी")
      ) ||
      voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(language.slice(0, 2)));

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    utterance.rate = speechRate || 0.95;

    utterance.onend = () => {
      utteranceRef.current = null;
      setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
    };
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      utteranceRef.current = null;
      setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
      setSpeechError("उत्तर आवाज़ में चल नहीं पाया। कृपया ब्राउज़र या इंटरनेट चेक करें।");
    };

    setSpeechError(null);
    utteranceRef.current = utterance;
    setActiveSpeechMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeak = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
      return;
    }

    const responseText = message.response_data?.response_text ?? message.content;
    const trimmedText = responseText.trim();
    if (!trimmedText) {
      setSpeechError("सुनाने के लिए उत्तर उपलब्ध नहीं है।");
      return;
    }

    if (/^(?:\{|\[)/.test(trimmedText)) {
      try {
        const parsed: unknown = JSON.parse(trimmedText);
        if (typeof parsed === "object" && parsed !== null) {
          setSpeechError("तकनीकी डेटा को आवाज़ में नहीं सुनाया जा सकता।");
          return;
        }
      } catch {
        // Continue
      }
    }

    // Clean text: strip emojis, warning icons, markdown, urls
    const cleanText = trimmedText
      .replace(/```[\s\S]*?```/g, " ")
      .replace(
        /^\s*(?:response_(?:source|mode|path|path_reason|text)|llm_[\w]+|kb_[\w]+|sources|limitations|cannot_determine)\s*:\s*.*$/gim,
        " "
      )
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
        ""
      )
      .replace(/[*#_`~>[\]]/g, "")
      .replace(/^[-•]\s*/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      setSpeechError("सुनाने के लिए उत्तर उपलब्ध नहीं है।");
      return;
    }

    // First try the high-quality server-side Hindi TTS
    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=hi`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = speechRate || 1.0;
      audioRef.current = audio;

      audio.onended = () => {
        audioRef.current = null;
        setActiveSpeechMessageId((activeId) => (activeId === message.id ? null : activeId));
      };

      audio.onerror = () => {
        // Server TTS failed or offline, fall back to browser Web Speech API
        audioRef.current = null;
        fallbackToBrowserSpeech(cleanText);
      };

      setSpeechError(null);
      setActiveSpeechMessageId(message.id);
      await audio.play();
    } catch {
      fallbackToBrowserSpeech(cleanText);
    }
  };

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 my-4">
        <div className="max-w-[85%] sm:max-w-xl space-y-1.5">
          <div className="bg-emerald-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md font-medium text-sm sm:text-base leading-relaxed">
            {message.content}
          </div>

          {/* Dialect translation indicator */}
          {message.dialect_info && message.dialect_info.has_dialect_terms && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-900 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-emerald-800">🗣️ बोली के शब्द (Dialect terms):</span>
              {message.dialect_info.dialect_matches.slice(0, 3).map((match, i) => (
                <span key={i} className="bg-white/80 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
                  <strong>{match.original_term}</strong> → {match.normalized_term}
                </span>
              ))}
            </div>
          )}

          <div className="text-[10px] text-slate-400 text-right pr-1">
            {message.timestamp}
          </div>
        </div>

        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-lg shrink-0 shadow-sm">
          👨‍🌾
        </div>
      </div>
    );
  }

  // Assistant message
  const resp = message.response_data;
  const urgency = resp?.final_urgency || "general";

  return (
    <div className="flex items-start gap-3 my-4">
      <div className="w-9 h-9 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-lg shrink-0 shadow-sm">
        🐄
      </div>

      <div className="max-w-[90%] sm:max-w-2xl bg-white rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        {/* Urgency Alert Badge */}
        {resp && (
          <UrgencyCard
            urgency={urgency}
            emergencyMessage={resp.emergency_check?.is_emergency ? resp.emergency_check.message_hi : null}
          />
        )}

        {/* Message Content rendered cleanly as formatted markdown */}
        <FormattedMarkdown content={message.content} />

        {/* Action Controls: Audio Speak & Save Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                isPlaying
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="सुनें (Listen)"
              aria-label={isPlaying ? "आवाज़ रोकें" : "उत्तर आवाज़ में सुनें"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "रोकें (Stop)" : "आवाज़ में सुनें (Listen)"}</span>
            </button>
            {speechError && (
              <span className="basis-full text-[11px] text-amber-700" role="status">
                {speechError}
              </span>
            )}

            {resp && (
              <>
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium transition"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>कार्ड में सेव करें</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🐄 *PashuMitra AI - पशु स्वास्थ्य परामर्श*\n\n` +
                    `❓ *प्रश्न:* ${userQuery || "पशु स्वास्थ्य समस्या"}\n\n` +
                    `💡 *परामर्श:* ${message.content.replace(/[*_#`]/g, "").slice(0, 350)}...\n\n` +
                    (resp.when_to_see_vet ? `🏥 *डॉक्टर सलाह:* ${resp.when_to_see_vet}\n\n` : "") +
                    `📞 आपातकालीन हेल्पलाइन: 1962`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 font-medium transition"
                  title="डॉक्टर को WhatsApp पर भेजें"
                >
                  <span>📱 WhatsApp</span>
                </a>
              </>
            )}
          </div>

          {/* Performance & Source Badges */}
          {resp && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {resp.total_latency_ms > 0 && (
                <span className="flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {resp.total_latency_ms}ms
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Database className="w-3 h-3 text-emerald-500" />
                {resp.response_path || "Offline"}
              </span>
            </div>
          )}
        </div>

        {/* Evidence & Verification Panels */}
        {resp && <EvidencePanel responseData={resp} />}
      </div>

      {resp && (
        <SaveConsultationModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          responseData={resp}
          userQuery={userQuery || message.content}
        />
      )}
    </div>
  );
};
