import React, { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, Trash2 } from "lucide-react";
import { useChat } from "../../context/ChatContext";

type VoiceLanguage = "hi-IN" | "en-IN";
type VoiceStatus = "idle" | "listening" | "processing" | "success" | "error";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike extends Array<SpeechRecognitionAlternativeLike> {
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}

function getRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र की साइट सेटिंग में माइक्रोफ़ोन चालू करें।";
    case "no-speech":
      return "आवाज़ नहीं मिली। कृपया फिर से बोलकर कोशिश करें।";
    case "audio-capture":
      return "माइक्रोफ़ोन उपलब्ध नहीं है। उसका कनेक्शन और अनुमति जाँचें।";
    case "network":
      return "वॉइस पहचान सेवा तक पहुँचा नहीं जा सका। इंटरनेट जाँचकर फिर कोशिश करें।";
    default:
      return "वॉइस पहचान में समस्या हुई। कृपया फिर कोशिश करें या सवाल टाइप करें।";
  }
}

export const ChatInput: React.FC = () => {
  const { sendMessage, isLoading, messages, clearMessages } = useChat();
  const [inputText, setInputText] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("hi-IN");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeardRef = useRef<string>("");

  useEffect(() => {
    const hasSpeech = Boolean(getSpeechRecognitionConstructor());
    const hasMedia = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
    setRecognitionSupported(hasSpeech || hasMedia);

    return () => {
      stopAllVoiceStreams();
    };
  }, []);

  const stopAllVoiceStreams = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  };

  const transcribeAudioBlob = async (blob: Blob) => {
    try {
      setVoiceStatus("processing");
      setStatusMessage("🧠 आवाज़ समझ रहे हैं (Whisper AI)...");

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: blob.type || "audio/webm",
          language: voiceLanguage === "en-IN" ? "en-IN" : "hi",
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const text = (data.text || "").trim();
      if (text) {
        setInputText(text);
        setVoiceStatus("success");
        setStatusMessage("✅ सवाल तैयार है! जाँचें और भेजें (Send)।");
      } else {
        setVoiceStatus("error");
        setStatusMessage("आवाज़ स्पष्ट नहीं सुनाई दी। कृपया थोड़ा तेज़ बोलें।");
      }
    } catch (err: any) {
      console.error("[ChatInput] Fallback transcription error:", err);
      setVoiceStatus("error");
      setStatusMessage("वॉइस पहचान में समस्या हुई। कृपया टाइप करके पूछें।");
    }
  };

  const handleToggleVoice = async () => {
    if (isListening) {
      stopAllVoiceStreams();
      return;
    }

    lastHeardRef.current = "";
    audioChunksRef.current = [];
    setVoiceStatus("processing");
    setStatusMessage("🎙️ माइक्रोफ़ोन से कनेक्ट हो रहे हैं...");

    // 1. Explicitly request microphone stream to ensure browser prompt appears
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.warn("[ChatInput] Microphone permission error:", err);
      setVoiceStatus("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatusMessage(
          "⚠️ माइक्रोफ़ोन की अनुमति ब्लॉक है। ब्राउज़र एड्रेस बार में लॉक (🔒) या माइक पर क्लिक करके 'Allow' करें।"
        );
      } else {
        setStatusMessage("माइक्रोफ़ोन नहीं मिला। कृपया माइक कनेक्शन जाँचें या सवाल टाइप करें।");
      }
      return;
    }

    setIsListening(true);
    setVoiceStatus("listening");
    setStatusMessage("🎙️ सुन रहे हैं... अपना सवाल बोलें (Speak now)");

    // 2. Start MediaRecorder as reliable audio backup
    let recorder: MediaRecorder | null = null;
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        const chunks = audioChunksRef.current;
        const totalSize = chunks.reduce((acc, c) => acc + c.size, 0);

        // If SpeechRecognition already gave us text, we don't need to re-transcribe
        if (lastHeardRef.current.trim().length > 0) {
          setInputText(lastHeardRef.current.trim());
          setVoiceStatus("success");
          setStatusMessage("✅ सवाल तैयार है! जाँचें और भेजें (Send)।");
        } else if (chunks.length > 0 && totalSize > 2000) {
          // Fall back to server Whisper AI
          const fullBlob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
          await transcribeAudioBlob(fullBlob);
        } else {
          setVoiceStatus("idle");
          setStatusMessage("");
        }
      };

      recorder.start(250);
    } catch (recErr) {
      console.warn("[ChatInput] MediaRecorder start error:", recErr);
    }

    // 3. Start Web Speech API for live transcription if available
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = voiceLanguage;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        const resetSilenceTimer = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopAllVoiceStreams();
          }, 3500);
        };

        recognition.onresult = (event) => {
          let accumulatedFinal = "";
          let interim = "";

          for (let i = 0; i < event.results.length; i += 1) {
            const res = event.results[i];
            const text = res[0]?.transcript || "";
            if (res.isFinal) {
              accumulatedFinal += text + " ";
            } else {
              interim += text;
            }
          }

          const currentFullText = (accumulatedFinal + interim).trim();
          if (currentFullText) {
            lastHeardRef.current = currentFullText;
            setInputText(currentFullText);
            setVoiceStatus("processing");
            setStatusMessage("✍️ " + currentFullText);
            resetSilenceTimer();
          }
        };

        recognition.onerror = (event) => {
          console.warn("[ChatInput] SpeechRecognition error:", event.error);
          // Don't kill audio recording on Google cloud STT network error; MediaRecorder will handle it
          if (event.error !== "no-speech" && event.error !== "aborted") {
            if (!mediaRecorderRef.current) {
              setStatusMessage(getRecognitionErrorMessage(event.error));
            }
          }
        };

        recognition.onend = () => {
          // If mediaRecorder is still going, do not cancel listening
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            setIsListening(false);
          }
        };

        recognition.start();
      } catch (speechErr) {
        console.warn("[ChatInput] SpeechRecognition start error:", speechErr);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() || isLoading) return;
    void sendMessage(inputText);
    setInputText("");
    setVoiceStatus("idle");
    setStatusMessage("");
  };

  return (
    <div className="bg-white border-t border-slate-200 p-3 sm:p-4 sticky bottom-0 shadow-lg">
      <div className="max-w-4xl mx-auto space-y-2">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearMessages}
                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition shrink-0"
                title="बातचीत साफ़ करें (Clear conversation)"
                aria-label="बातचीत साफ़ करें"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <div className="flex shrink-0 rounded-xl bg-slate-100 p-1" aria-label="वॉइस भाषा चुनें">
              <button
                type="button"
                onClick={() => setVoiceLanguage("hi-IN")}
                aria-pressed={voiceLanguage === "hi-IN"}
                disabled={isListening}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  voiceLanguage === "hi-IN"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                } disabled:opacity-60`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setVoiceLanguage("en-IN")}
                aria-pressed={voiceLanguage === "en-IN"}
                disabled={isListening}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  voiceLanguage === "en-IN"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                } disabled:opacity-60`}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isLoading || (!recognitionSupported && voiceStatus !== "error")}
              className={`p-3 rounded-2xl transition shrink-0 flex items-center justify-center ${
                isListening
                  ? "bg-red-600 text-white animate-pulse shadow-lg ring-4 ring-red-200"
                  : "bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={
                recognitionSupported
                  ? isListening
                    ? "सुनना रोकें (Stop listening)"
                    : "बोलकर पूछें (Voice input)"
                  : "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है"
              }
              aria-label={isListening ? "सुनना रोकें" : "बोलकर सवाल पूछें"}
            >
              {voiceStatus === "processing" && !isListening ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder={
                  isListening
                    ? "🎙️ सुन रहे हैं... बोलिए (Listening...)"
                    : "यहाँ अपना सवाल लिखें... (Type question in Hindi/Rajasthani/English)"
                }
                disabled={isLoading}
                aria-label="अपना सवाल लिखें या बोली गई बात संपादित करें"
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium placeholder-slate-400 transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-xl font-bold transition flex items-center justify-center ${
                  inputText.trim() && !isLoading
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                aria-label="सवाल भेजें"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-400 px-1">
          <span aria-live="polite">
            {statusMessage || "🎙️ बोलकर अपना सवाल पूछें"}
          </span>
          {!recognitionSupported && (
            <span className="text-amber-700">
              वॉइस इनपुट समर्थित नहीं है; टाइप करके पूछें।
            </span>
          )}
          <span className="hidden sm:inline">⚠️ यह केवल प्राथमिक पशु स्वास्थ्य परामर्श है</span>
        </div>
      </div>
    </div>
  );
};
