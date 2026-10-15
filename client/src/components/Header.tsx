import React from "react";
import { Phone, Menu, Globe, LogOut, User as UserIcon } from "lucide-react";
import { useApp } from "../context/AppContext";

export const Header: React.FC = () => {
  const {
    languageMode,
    setLanguageMode,
    sidebarOpen,
    setSidebarOpen,
    fontSize,
    setFontSize,
    speechRate,
    setSpeechRate,
    currentUser,
    logout,
  } = useApp();

  return (
    <header className="bg-gradient-header text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5">
            <span className="text-3xl filter drop-shadow">🐄</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                PashuMitra AI
                <span className="text-xs bg-emerald-500/30 text-emerald-100 font-medium px-2 py-0.5 rounded-full border border-emerald-400/30">
                  v2.0
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                ग्रामीण भारत के लिए आवाज-आधारित पशु स्वास्थ्य सहायक
              </p>
            </div>
          </div>
        </div>

        {/* Right: Accessibility, Language switch & Helpline */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Font Size Scaling (A- / A / A+) */}
          <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/20 text-xs font-bold">
            <button
              onClick={() => setFontSize("normal")}
              className={`px-2 py-1 rounded-lg transition ${
                fontSize === "normal" ? "bg-white text-emerald-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
              title="सामान्य टेक्स्ट (Normal Text)"
            >
              A
            </button>
            <button
              onClick={() => setFontSize("large")}
              className={`px-2 py-1 rounded-lg transition ${
                fontSize === "large" ? "bg-white text-emerald-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
              title="बड़ा टेक्स्ट (Large Text)"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize("xlarge")}
              className={`px-2 py-1 rounded-lg transition ${
                fontSize === "xlarge" ? "bg-white text-emerald-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
              title="बहुत बड़ा टेक्स्ट (Extra Large)"
            >
              A++
            </button>
          </div>

          {/* Speech Rate (0.8x / 1.0x / 1.2x) */}
          <div className="hidden lg:flex items-center bg-white/10 rounded-xl px-2 py-1 border border-white/20 text-xs font-semibold text-white/90">
            <span className="mr-1 text-[11px] text-emerald-200">गति:</span>
            <button
              onClick={() => {
                const nextRate = speechRate === 0.8 ? 1.0 : speechRate === 1.0 ? 1.2 : 0.8;
                setSpeechRate(nextRate);
              }}
              className="bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded text-[11px] font-bold"
              title="आवाज की गति बदलें"
            >
              {speechRate}x
            </button>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/20 backdrop-blur-sm">
            <Globe className="w-3.5 h-3.5 ml-1.5 mr-1 text-emerald-200" />
            <button
              onClick={() => setLanguageMode("hindi")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                languageMode === "hindi"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguageMode("rajasthani")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                languageMode === "rajasthani"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              राजस्थानी
            </button>
          </div>

          {/* Find Nearby Vet Hospital on Maps */}
          <a
            href="https://www.google.com/maps/search/veterinary+hospital+near+me"
            target="_blank"
            rel="noreferrer"
            className="hidden xl:flex items-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-400/30 text-white font-medium text-xs px-3 py-1.5 rounded-xl shadow-sm transition"
            title="Google Maps पर नजदीकी पशु चिकित्सालय खोजें"
          >
            <span>📍 नजदीकी अस्पताल</span>
          </a>

          {/* National Toll-Free Helpline */}
          <a
            href="tel:1962"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-xl shadow transition"
          >
            <Phone className="w-3.5 h-3.5 text-slate-900 animate-bounce shrink-0" />
            <div className="text-left text-xs leading-tight">
              <span className="text-[10px] block font-semibold text-slate-800 leading-none">हेल्पलाइन</span>
              <span>1962</span>
            </div>
          </a>

          {/* User Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-black/20 hover:bg-black/30 border border-white/20 rounded-xl px-2.5 py-1 backdrop-blur-sm transition">
              <div className="w-7 h-7 rounded-lg bg-emerald-400 text-emerald-950 font-extrabold flex items-center justify-center text-xs shadow">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:block text-left text-xs leading-none max-w-[140px]">
                <span className="font-bold text-white truncate block">
                  {currentUser.name || currentUser.email.split("@")[0]}
                </span>
                <span className="text-[10px] text-emerald-200/90 truncate block mt-0.5">
                  {currentUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-rose-200 transition focus:outline-none ml-1"
                title="लॉगआउट करें (Sign Out)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
