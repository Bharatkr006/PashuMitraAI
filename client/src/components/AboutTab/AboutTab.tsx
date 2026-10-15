import React from "react";
import { BookOpen, Layers, Shield, Sparkles } from "lucide-react";

export const AboutTab: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Hero Mission */}
      <div className="bg-gradient-header text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-3">
        <div className="flex items-center gap-2.5 text-emerald-200 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>हमारा उद्देश्य (Our Mission)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          ग्रामीण भारत के पशुपालकों के लिए आवाज-आधारित, सुरक्षित व निःशुल्क पशु स्वास्थ्य परामर्श
        </h2>
        <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed max-w-3xl">
          PashuMitra AI भारतीय ग्रामीण पशुपालकों, विशेषकर कम साक्षरता वाले किसानों को उनकी अपनी क्षेत्रीय भाषा व बोली (हिन्दी, मारवाड़ी/राजस्थानी) में सटीक, ICAR/NDDB अनुमोदित प्राथमिक पशु चिकित्सा मार्गदर्शन उपलब्ध कराता है।
        </p>
      </div>

      {/* Architecture Flow */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>🏗️ सिस्टम आर्किटेक्चर (PashuMitra Architecture)</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600">
          सभी प्रश्न सबसे पहले नियम-आधारित सुरक्षा फिल्टर से गुजरते हैं। किसी भी आपातकाल या दवा की खुराक में AI को बायपास करके पूर्व-सत्यापित निर्देश दिए जाते हैं:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="font-bold text-emerald-700">1. इनपुट व सामान्यीकरण</span>
            <p className="text-slate-500">आवाज या टेक्स्ट → बोली शब्दकोश द्वारा मानक शब्दावली में रूपांतरण</p>
          </div>
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
            <span className="font-bold text-rose-700">2. आपातकालीन सुरक्षा</span>
            <p className="text-rose-600">100% नियम-आधारित। गंभीर लक्षणों पर तुरंत 1962 हेल्पलाइन निर्देश</p>
          </div>
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
            <span className="font-bold text-blue-700">3. ज्ञानकोष मिलान (KB)</span>
            <p className="text-blue-600">ICAR व NDDB सत्यापित 20+ पशु स्वास्थ्य रिकॉर्ड्स से सटीक मिलान</p>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
            <span className="font-bold text-emerald-700">4. प्रतिक्रिया व ऑडियो</span>
            <p className="text-emerald-600">सरल भाषा में उत्तर, स्रोत विवरण, और हिंदी आवाज में वाचन (TTS)</p>
          </div>
        </div>
      </div>

      {/* Free Tool Stack */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span>🆓 तकनीक व ओपन स्टैक (Free Tool Stack)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">टूल / तकनीक</th>
                <th className="py-2.5 px-3">उद्देश्य</th>
                <th className="py-2.5 px-3">लागत</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">React + TypeScript + Vite</td>
                <td className="py-3 px-3">आधुनिक, तीव्र गति व रिस्पॉन्सिव वेब इंटरफेस</td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">निःशुल्क (Open Source)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">Node.js + Express</td>
                <td className="py-3 px-3">सुरक्षित API बैकएंड व 9-चरणीय पाइपलाइन</td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">निःशुल्क (Open Source)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">Groq SDK (server-configured model)</td>
                <td className="py-3 px-3">सामान्य पशु-देखभाल प्रश्नों के लिए AI उत्तर</td>
                <td className="py-3 px-3 text-slate-600 font-semibold">Provider plan and quota apply</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">SQLite (Better-Sqlite3)</td>
                <td className="py-3 px-3">गोपनीय पशु स्वास्थ्य कार्ड डेटाबेस</td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">निःशुल्क (लोकल स्टोरेज)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">Web Speech API</td>
                <td className="py-3 px-3">ब्राउज़र-आधारित आवाज पहचान व वाचन</td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">निःशुल्क (Built-in)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900">Render Cloud</td>
                <td className="py-3 px-3">सरल 1-क्लिक होस्टिंग व तैनाती</td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">Render Free Plan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <span>📚 आधिकारिक ज्ञान स्रोत (Authoritative Sources)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
            <span className="font-bold text-purple-900 block text-sm">ICAR (भा.कृ.अनु.प.)</span>
            <p className="text-slate-600">भारतीय कृषि अनुसंधान परिषद</p>
            <a href="https://icar.org.in" target="_blank" rel="noreferrer" className="text-purple-700 font-semibold hover:underline block pt-1">
              icar.org.in ↗
            </a>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
            <span className="font-bold text-blue-900 block text-sm">NDDB (एन.डी.डी.बी.)</span>
            <p className="text-slate-600">राष्ट्रीय डेयरी विकास बोर्ड</p>
            <a href="https://nddb.coop" target="_blank" rel="noreferrer" className="text-blue-700 font-semibold hover:underline block pt-1">
              nddb.coop ↗
            </a>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 block text-sm">DAHD (पशुपालन विभाग)</span>
            <p className="text-slate-600">पशुपालन और डेयरी विभाग, भारत सरकार</p>
            <a href="https://dahd.nic.in" target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold hover:underline block pt-1">
              dahd.nic.in ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
