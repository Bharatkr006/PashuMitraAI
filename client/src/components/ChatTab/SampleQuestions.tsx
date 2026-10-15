import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface SampleQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

export const SampleQuestions: React.FC<SampleQuestionsProps> = ({ onSelectQuestion }) => {
  const [isOpen, setIsOpen] = useState(true);

  const sampleQuestions = [
    { label: "मेरी गाय खाना नहीं खा रही है", tag: "भूख की कमी", icon: "🌾" },
    { label: "भैंस का पेट फूल गया है बहुत ज़्यादा", tag: "गंभीर अफारा (Bloat)", icon: "⚠️" },
    { label: "गाय गिर गई है और उठ नहीं पा रही", tag: "आपातकाल (Emergency)", icon: "🚨" },
    { label: "बकरी को दस्त हो रहे हैं", tag: "दस्त (Diarrhea)", icon: "🐐" },
    { label: "जानवर ने कुछ ज़हरीला खा लिया लग रहा है", tag: "विषाक्तता (Poison)", icon: "☠️" },
    { label: "आफरो आयो भैंस को", tag: "राजस्थानी बोली", icon: "🗣️" },
    { label: "मेरे जानवर को एमोक्सिसिलिन कितनी देनी चाहिए", tag: "दवा सुरक्षा (Refusal)", icon: "🛑" },
    { label: "पशु को कौन सा टीका कब लगवाना चाहिए", tag: "टीकाकरण (Vaccines)", icon: "💉" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition text-xs font-bold text-slate-700"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>💡 त्वरित प्रश्न (Click to test sample queries)</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onSelectQuestion(q.label)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-left transition group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{q.icon}</span>
                <span className="text-xs font-medium text-slate-800 group-hover:text-emerald-900 truncate">
                  {q.label}
                </span>
              </div>
              <span className="text-[10px] shrink-0 font-semibold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200 group-hover:border-emerald-200 group-hover:text-emerald-700 ml-2">
                {q.tag}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
