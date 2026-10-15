import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { UrgencyLevel } from "../../types";

interface UrgencyCardProps {
  urgency: UrgencyLevel;
  emergencyMessage?: string | null;
}

export const UrgencyCard: React.FC<UrgencyCardProps> = ({ urgency, emergencyMessage }) => {
  if (urgency === "emergency") {
    return (
      <div className="rounded-2xl p-4 bg-red-50 border-2 border-red-500 shadow-sm animate-emergency my-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-red-700 tracking-wide">
                🚨 आपातकाल (EMERGENCY)
              </span>
              <span className="text-[10px] bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded-full uppercase">
                तत्काल ध्यान आवश्यक
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-red-900 mt-1">
              तुरंत पशु चिकित्सक से संपर्क करें! (Seek immediate veterinary care)
            </p>
            {emergencyMessage && (
              <div className="mt-2.5 p-3 rounded-xl bg-white/80 border border-red-200 text-xs sm:text-sm text-red-950 font-medium whitespace-pre-line">
                {emergencyMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (urgency === "prompt") {
    return (
      <div className="rounded-2xl p-3.5 bg-amber-50 border border-amber-300 shadow-sm my-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-800">
                ⚠️ जल्द डॉक्टर दिखाएं (Prompt Care)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900 mt-0.5">
              जल्द से जल्द पशु चिकित्सक से परामर्श लें (Arrange veterinary assessment soon)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 bg-emerald-50 border border-emerald-200 my-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-xs sm:text-sm text-emerald-900">
            ℹ️ सामान्य जानकारी (General Guidance)
          </span>
          <p className="text-xs text-emerald-700">
            पशु पर नज़र रखें और यदि स्थिति बिगड़े तो डॉक्टर से मिलें
          </p>
        </div>
      </div>
    </div>
  );
};
