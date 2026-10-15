import React, { useRef, useEffect } from "react";
import { Loader2, Info } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useApp } from "../../context/AppContext";
import { ChatMessageItem } from "./ChatMessageItem";
import { SampleQuestions } from "./SampleQuestions";
import { ChatInput } from "./ChatInput";

export const ChatTab: React.FC = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const { selectedAnimal, setSelectedAnimal, languageMode, setLanguageMode, lastResponse } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showFirstAid, setShowFirstAid] = React.useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const speciesIcons: Record<string, string> = {
    cattle: "🐄",
    buffalo: "🐃",
    goat: "🐐",
    sheep: "🐑",
  };

  const hasRajasthaniMatch =
    languageMode === "hindi" &&
    lastResponse?.dialect_info?.has_dialect_terms;

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Selected Animal Notice Banner */}
      <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          {selectedAnimal ? (
            <>
              <span className="text-lg">{speciesIcons[selectedAnimal] || "🐾"}</span>
              <span className="font-semibold text-emerald-950">
                चयनित पशु: <span className="capitalize">{selectedAnimal}</span>
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-600">
                पशु चुनें (बाएं मेनू से) अथवा प्रश्न में स्वतः पहचान होने दें।
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFirstAid(!showFirstAid)}
            className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition"
          >
            🚑 प्राथमिक उपचार गाइड (First Aid)
          </button>
          {selectedAnimal && (
            <button
              onClick={() => setSelectedAnimal(null)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              हटाएं (Auto)
            </button>
          )}
        </div>
      </div>

      {/* Dialect Switch Suggestion Banner */}
      {hasRajasthaniMatch && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 animate-fadeIn">
          <span>
            🗣️ आपके प्रश्न में राजस्थानी शब्द मिले। क्या आप राजस्थानी भाषा में उत्तर चाहते हैं?
          </span>
          <button
            onClick={() => setLanguageMode("rajasthani")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg ml-2 shrink-0 transition"
          >
            राजस्थानी चुनें
          </button>
        </div>
      )}

      {/* First Aid Dropdown */}
      {showFirstAid && (
        <div className="p-4 bg-white border-b border-slate-200 text-xs shadow-md space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
            <span>🚨 आपातकालीन सुरक्षित प्राथमिक उपचार (Safe First Aid Tips):</span>
            <button onClick={() => setShowFirstAid(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 bg-red-50 rounded-xl border border-red-200">
              <span className="font-bold text-red-800 block">अफारा (Severe Bloat):</span>
              <p className="text-red-950 mt-0.5">पशु को बैठाने न दें; सिर ऊपर रख धीरे-धीरे चलाएं। मुंह में लकड़ी की खपच्ची लगा सकते हैं ताकि गैस निकले।</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-800 block">लू / गर्मी (Heat Stroke):</span>
              <p className="text-amber-950 mt-0.5">पशु को तुरंत ठंडी छाया में ले जाएं। शरीर पर ताजा ठंडा पानी डालें (मुंह व नाक बचाकर)।</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-800 block">दस्त (Diarrhea):</span>
              <p className="text-blue-950 mt-0.5">शरीर में पानी की कमी न होने दें। नमक-चीनी-चावल का मांड या ओआरएस (ORS) का घोल दें।</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100/70 text-4xl rounded-3xl flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
              🐄
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                नमस्ते! मैं PashuMitra AI हूँ।
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                अपने बीमार पशु के लक्षण बताएं। मैं भारतीय पशु अनुसंधान परिषद (ICAR/NDDB) द्वारा सत्यापित प्राथमिक उपचार और परामर्श प्रदान करता हूँ।
              </p>
            </div>

            {/* Quick Test Samples */}
            <div className="text-left pt-2">
              <SampleQuestions onSelectQuestion={(q) => sendMessage(q)} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 pb-2">
            {messages.map((msg, index) => {
              const previousUserQuery =
                msg.role === "assistant" && index > 0 && messages[index - 1].role === "user"
                  ? messages[index - 1].content
                  : undefined;

              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  userQuery={previousUserQuery}
                />
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md animate-pulse">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                <div className="text-xs sm:text-sm font-medium text-slate-700">
                  <span>🔍 ज्ञानकोष में जांच रहे हैं व सुरक्षित उत्तर तैयार कर रहे हैं...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput />
    </div>
  );
};
