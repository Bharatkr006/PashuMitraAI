import React from "react";
import { Phone, ShieldAlert, Sparkles, X, PlusCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export const Sidebar: React.FC = () => {
  const {
    selectedAnimal,
    setSelectedAnimal,
    animals,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
  } = useApp();

  const speciesList = [
    { id: null, label: "कोई भी / स्वचालित", icon: "🐾", en: "Auto-detect" },
    { id: "cattle", label: "गाय (Cow / Cattle)", icon: "🐄", en: "Cattle" },
    { id: "buffalo", label: "भैंस (Buffalo)", icon: "🐃", en: "Buffalo" },
    { id: "goat", label: "बकरी (Goat)", icon: "🐐", en: "Goat" },
    { id: "sheep", label: "भेड़ (Sheep)", icon: "🐑", en: "Sheep" },
  ];

  const content = (
    <div className="flex flex-col h-full space-y-6">
      {/* Species Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          पशु का चयन (Select Animal)
        </h3>
        <div className="space-y-1.5">
          {speciesList.map((item) => {
            const isSelected = selectedAnimal === item.id;
            return (
              <button
                key={item.id || "auto"}
                onClick={() => {
                  setSelectedAnimal(item.id);
                  if (sidebarOpen) setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-emerald-50 border-2 border-emerald-600 text-emerald-900 shadow-sm"
                    : "bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{item.icon}</span>
                  <div className="text-left">
                    <span className="font-semibold block">{item.label}</span>
                  </div>
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Registered Animals Quick List */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            मेरे पशु ({animals.length})
          </h3>
          <button
            onClick={() => {
              setActiveTab("health-card");
              if (sidebarOpen) setSidebarOpen(false);
            }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" /> जोड़ें
          </button>
        </div>

        {animals.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">कोई पशु दर्ज नहीं है। स्वास्थ्य कार्ड में जोड़ें।</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {animals.slice(0, 5).map((animal) => {
              const icon =
                animal.species === "buffalo"
                  ? "🐃"
                  : animal.species === "goat"
                  ? "🐐"
                  : animal.species === "sheep"
                  ? "🐑"
                  : "🐄";
              return (
                <div
                  key={animal.id}
                  onClick={() => {
                    setSelectedAnimal(animal.species);
                    if (sidebarOpen) setSidebarOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <div className="font-semibold text-xs text-slate-800">{animal.nickname}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{animal.species}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    चुनें
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Notice Card */}
      <div className="bg-gradient-to-br from-rose-50 to-red-100 rounded-2xl p-4 border border-rose-200 text-rose-900 shadow-sm">
        <div className="flex items-start gap-2.5 mb-2">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wide text-red-700">आपातकालीन सूचना</h4>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              यदि पशु गिर गया हो, मुंह खोलकर सांस ले रहा हो या जहर खाया हो तो तुरंत 1962 डायल करें।
            </p>
          </div>
        </div>
        <a
          href="tel:1962"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow transition"
        >
          <Phone className="w-3.5 h-3.5" /> 1962 पर कॉल करें
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 lg:w-80 shrink-0 py-6">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-50 h-full p-4 overflow-y-auto shadow-2xl z-50">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800">पशु नियंत्रण (Menu)</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
};
