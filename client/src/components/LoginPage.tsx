import React, { useState } from "react";
import {
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  AlertCircle,
  Phone,
  Globe,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Flame,
  Info,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, isFirebaseActive, languageMode, setLanguageMode } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetupHelp, setShowSetupHelp] = useState(false);

  const isHindi = languageMode === "hindi";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(
        isHindi
          ? "कृपया अपना ईमेल पता दर्ज करें।"
          : "कृपया आपरो ईमेल एड्रेस लिखो।"
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(
        isHindi
          ? "कृपया एक मान्य ईमेल पता दर्ज करें (उदा. kisan@example.com)"
          : "कृपया साचो ईमेल लिखो (उदा. kisan@example.com)"
      );
      return;
    }

    try {
      setIsLoading(true);
      await login(trimmedEmail, name.trim() || undefined, password.trim() || undefined);
    } catch (err: any) {
      console.error("Login failed:", err);
      let errMsg = err.message || "";
      if (err.code === "auth/invalid-email") {
        errMsg = isHindi ? "अमान्य ईमेल प्रारूप।" : "अमान्य ईमेल एड्रेस।";
      } else if (err.code === "auth/weak-password") {
        errMsg = isHindi
          ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
          : "पासवर्ड कम से कम 6 अक्षरां रो होणो चाहिजे।";
      } else if (err.code === "auth/wrong-password") {
        errMsg = isHindi ? "गलत पासवर्ड।" : "गलत पासवर्ड।";
      }
      setError(
        errMsg ||
          (isHindi
            ? "प्रमाणीकरण में समस्या आई। कृपया पुनः प्रयास करें।"
            : "लॉगिन में परेशानी आई, फेर कोशिश करो।")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setIsGoogleLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      setError(
        err.message ||
          (isHindi
            ? "Google साइन-इन में त्रुटि हुई।"
            : "Google साइन-इन में परेशानी आई।")
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Header */}
      <header className="bg-gradient-header text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl sm:text-3xl">🐄</span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                PashuMitra AI
              </h1>
              <p className="text-xs text-emerald-100 hidden sm:block">
                ग्रामीण भारत के लिए आवाज-आधारित पशु स्वास्थ्य सहायक
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20 text-xs">
              <Globe className="w-3.5 h-3.5 ml-2 mr-1 text-emerald-200" />
              <button
                type="button"
                onClick={() => setLanguageMode("hindi")}
                className={`px-2 py-1 rounded transition font-medium ${
                  languageMode === "hindi"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode("rajasthani")}
                className={`px-2 py-1 rounded transition font-medium ${
                  languageMode === "rajasthani"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                राजस्थानी
              </button>
            </div>

            {/* Helpline */}
            <a
              href="tel:1962"
              className="hidden sm:flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-2.5 py-1 rounded-lg text-xs transition"
            >
              <Phone className="w-3 h-3 text-slate-900" />
              <span>हेल्पलाइन 1962</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-100">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isHindi ? "पोर्टल में प्रवेश करें" : "पोर्टल में स्वागत है"}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
                {isHindi
                  ? "पशु स्वास्थ्य परामर्श एवं रिकॉर्ड देखने हेतु साइन इन करें"
                  : "पशु री सेहत अर जांच खातर लॉगिन करो"}
              </p>

              {/* Firebase Status Badge */}
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {isFirebaseActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                    Firebase Auth सक्रिय
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSetupHelp(!showSetupHelp)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                  >
                    <Info className="w-3 h-3" />
                    <span>Firebase Auth कॉन्फ़िगरेशन विवरण</span>
                  </button>
                )}
              </div>
            </div>

            {/* Firebase Config Helper Notice */}
            {showSetupHelp && !isFirebaseActive && (
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-1">
                  Firebase Authentication जोड़ने के लिए:
                </p>
                <p className="mb-2">
                  अपनी <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">.env</code> फ़ाइल में निम्नलिखित कुंजी जोड़ें:
                </p>
                <pre className="bg-slate-800 text-slate-200 p-2 rounded-lg text-[10px] overflow-x-auto select-all">
                  VITE_FIREBASE_API_KEY=your_key{'\n'}
                  VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com{'\n'}
                  VITE_FIREBASE_PROJECT_ID=your_project_id{'\n'}
                  VITE_FIREBASE_APP_ID=your_app_id
                </pre>
                <p className="mt-2 text-[11px] text-slate-500">
                  (यदि आप अभी कॉन्फ़िगर नहीं करना चाहते हैं, तो भी आप ईमेल से सीधे साइन इन कर सकते हैं)
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign-In Button (When Firebase is active) */}
            {isFirebaseActive && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm transition text-xs sm:text-sm disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>
                    {isHindi ? "Google खाते से साइन इन करें" : "Google सूं लॉगिन करो"}
                  </span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-white px-2 text-slate-400 font-medium">
                      {isHindi ? "या ईमेल द्वारा" : "या ईमेल सूं"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {isHindi ? "ईमेल पता" : "ईमेल एड्रेस"}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="kisan@example.com"
                    autoComplete="email"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition disabled:bg-slate-50"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {isHindi
                    ? "ईमेल दर्ज करने पर यदि खाता नहीं है तो स्वतः बन जाएगा।"
                    : "खातो नहीं होवेला तो ईमेल लिखतां ही आप ही बण ज्यावेगा।"}
                </p>
              </div>

              {/* Password Field (Optional / Auto-managed for seamless UX) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {isHindi ? "पासवर्ड" : "पासवर्ड"}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {isHindi ? "वैकल्पिक (Optional)" : "चाहे तो लिखो"}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isHindi ? "रिक्त छोड़ने पर स्वतः प्रबंधित होगा" : "खाली छोड़ सको हो"
                    }
                    autoComplete="current-password"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {isHindi ? "आपका नाम" : "आपरो नाम"}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {isHindi ? "वैकल्पिक" : "चाहे तो लिखो"}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      isHindi ? "उदा. रमेश पटेल" : "उदा. रमेश"
                    }
                    disabled={isLoading || isGoogleLoading}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition disabled:bg-slate-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {isHindi ? "सत्यापित किया जा रहा है..." : "जांच हो रही है..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{isHindi ? "साइन इन करें" : "लॉगिन करो"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom info */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span>🔒</span>
              <span>
                {isHindi
                  ? "Firebase व स्थानीय डेटा सुरक्षा समर्थित"
                  : "सुरक्षित प्रमाणीकरण"}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PashuMitra AI • पशु स्वास्थ्य एवं टेली-परामर्श मंच</span>
          <span>राष्ट्रीय पशु रोग नियंत्रण कार्यक्रम • हेल्पलाइन: 1962</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
