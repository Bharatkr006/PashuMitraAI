import React, { useState } from "react";
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, AlertCircle, Stethoscope } from "lucide-react";
import { ResponseData } from "../../types";

interface EvidencePanelProps {
  responseData: ResponseData;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ responseData }) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  const { sources, cannot_determine, when_to_see_vet } = responseData;

  return (
    <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
      {/* When to see vet */}
      {when_to_see_vet && (
        <div className="flex items-start gap-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100 text-blue-900">
          <Stethoscope className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">डॉक्टर कब दिखाएं (When to see a vet):</span>
            <span className="text-blue-950 font-medium">{when_to_see_vet}</span>
          </div>
        </div>
      )}

      {/* Sources Expandable */}
      {sources && sources.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="w-full flex items-center justify-between p-2.5 text-left font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>📚 स्रोत / Evidence & Sources ({sources.length})</span>
            </div>
            {sourcesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {sourcesOpen && (
            <div className="p-3 space-y-2 bg-white border-t border-slate-200">
              {sources.map((src, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>📖 {src.name || "ICAR / NDDB Guidelines"}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-normal text-[11px]"
                      >
                        देखें <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {src.verified && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      सत्यापन तिथि (Last verified): {src.verified}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Limitations Expandable */}
      {cannot_determine && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <button
            onClick={() => setLimitsOpen(!limitsOpen)}
            className="w-full flex items-center justify-between p-2.5 text-left font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>⚠️ सिस्टम की सीमाएं (What cannot be determined)</span>
            </div>
            {limitsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {limitsOpen && (
            <div className="p-3 bg-white border-t border-slate-200 text-slate-600 leading-relaxed">
              <p>{cannot_determine}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
