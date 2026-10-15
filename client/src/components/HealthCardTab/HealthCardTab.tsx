import React, { useState, useEffect } from "react";
import {
  CreditCard,
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Printer,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { HealthObservation } from "../../types";

export const HealthCardTab: React.FC = () => {
  const { animals, addAnimal, deleteAnimal, setSelectedAnimal, setActiveTab } = useApp();

  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("cattle");
  const [age, setAge] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const [expandedAnimalId, setExpandedAnimalId] = useState<number | null>(
    animals[0]?.id || null
  );
  const [animalHistories, setAnimalHistories] = useState<Record<number, HealthObservation[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);

  const loadHistory = async (id: number) => {
    setLoadingHistory(id);
    try {
      const res = await fetch(`/api/animals/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setAnimalHistories((prev) => ({ ...prev, [id]: data }));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(null);
    }
  };

  useEffect(() => {
    if (expandedAnimalId) {
      loadHistory(expandedAnimalId);
    }
  }, [expandedAnimalId]);

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert("कृपया स्थानीय स्टोरेज के लिए सहमति प्रदान करें।");
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = await addAnimal(nickname, species, age, notes);
      setNickname("");
      setAge("");
      setNotes("");
      setFormSuccess(true);
      setExpandedAnimalId(newId);
      setTimeout(() => setFormSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("पशु जोड़ने में त्रुटि हुई।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const speciesIcons: Record<string, string> = {
    cattle: "🐄",
    buffalo: "🐃",
    goat: "🐐",
    sheep: "🐑",
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Privacy Notice */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              Pashu Health Card — पशु स्वास्थ्य कार्ड
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              पशुओं का व्यक्तिगत स्वास्थ्य इतिहास व परामर्श रिकॉर्ड
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-blue-900">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>गोपनीयता सूचना (Privacy Notice):</strong> सभी स्वास्थ्य रिकॉर्ड केवल आपके इस डिवाइस (लोकल SQLite डेटाबेस) में सुरक्षित रहते हैं। कोई भी व्यक्तिगत डेटा किसी बाहरी सर्वर पर नहीं भेजा जाता। आप किसी भी समय अपना रिकॉर्ड हटा सकते हैं।
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Add New Animal */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-800">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>➕ नया पशु जोड़ें (Add Animal)</span>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              ✅ पशु कार्ड सफलतापूर्वक दर्ज हो गया!
            </div>
          )}

          <form onSubmit={handleAddAnimal} className="space-y-3.5 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                पशु का नाम या टैग ID (Nickname/Tag):
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="उदा. गंगा (Ganga), Tag#102"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                पशु प्रकार (Species): *
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold capitalize"
              >
                <option value="cattle">गाय (Cattle / Cow)</option>
                <option value="buffalo">भैंस (Buffalo)</option>
                <option value="goat">बकरी (Goat)</option>
                <option value="sheep">भेड़ (Sheep)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                अनुमानित उम्र (Approximate Age):
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="उदा. 3 साल, 6 महीने"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                अतिरिक्त जानकारी / नस्ल (Notes):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="नस्ल (उदा. मुर्रा, राठी), रंग, पहचान..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-600 cursor-pointer">
                ✅ मैं सहमत हूँ कि यह डेटा मेरे डिवाइस पर सुरक्षित रहे (I consent to local storage)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !consent}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-md transition"
            >
              {isSubmitting ? "सहेजा जा रहा है..." : "🐄 पशु कार्ड बनाएं"}
            </button>
          </form>
        </div>

        {/* Right Column: Animal Cards & History */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span>📋 मेरे पंजीकृत पशु</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {animals.length}
              </span>
            </h3>
          </div>

          {animals.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400 space-y-2">
              <p className="text-4xl">🐾</p>
              <p className="font-semibold text-slate-600">अभी तक कोई पशु नहीं जोड़ा गया है।</p>
              <p className="text-xs">बाएं फॉर्म से अपना पहला पशु जोड़ें!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {animals.map((animal) => {
                const isExpanded = expandedAnimalId === animal.id;
                const history = animalHistories[animal.id] || [];

                return (
                  <div
                    key={animal.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition"
                  >
                    {/* Animal Card Header */}
                    <div
                      onClick={() =>
                        setExpandedAnimalId(isExpanded ? null : animal.id)
                      }
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 bg-slate-100 rounded-2xl">
                          {speciesIcons[animal.species] || "🐾"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-800">
                              {animal.nickname}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold capitalize">
                              {animal.species}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            उम्र: {animal.approximate_age || "अज्ञात"} • दर्ज: {animal.created_at?.slice(0, 10)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnimal(animal.species);
                            setActiveTab("chat");
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                        >
                          💬 परामर्श लें
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded History Body */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-4">
                        {animal.notes && (
                          <div className="text-xs bg-white p-3 rounded-xl border border-slate-100 text-slate-600">
                            <strong>टिप्पणी (Notes):</strong> {animal.notes}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-blue-600" />
                              स्वास्थ्य इतिहास (Health History — {history.length} रिकॉर्ड)
                            </span>
                          </div>

                          {loadingHistory === animal.id ? (
                            <p className="text-xs text-slate-400 py-3">इतिहास लोड हो रहा है...</p>
                          ) : history.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-100">
                              इस पशु के लिए अभी तक कोई परामर्श रिकॉर्ड नहीं है। चैट में परामर्श करते समय "कार्ड में सेव करें" दबाएं।
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                              {history.map((obs) => {
                                const urgencyColor =
                                  obs.urgency_level === "emergency"
                                    ? "border-red-300 bg-red-50 text-red-900"
                                    : obs.urgency_level === "prompt"
                                    ? "border-amber-300 bg-amber-50 text-amber-900"
                                    : "border-emerald-200 bg-white text-slate-800";

                                return (
                                  <div
                                    key={obs.id}
                                    className={`p-3 rounded-xl border ${urgencyColor} shadow-2xl text-xs space-y-1.5`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                                        {obs.observation_date}
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90">
                                        {obs.urgency_level}
                                      </span>
                                    </div>
                                    <div className="font-medium">
                                      <span className="text-slate-500">लक्षण: </span>
                                      {obs.symptoms}
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                      <p className="text-slate-600 line-clamp-2 leading-relaxed flex-1 mr-2">
                                        {obs.response_summary}
                                      </p>
                                      <a
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                          `📋 *पशु स्वास्थ्य रिकॉर्ड - ${animal.nickname} (${animal.species})*\n` +
                                          `📅 दिनांक: ${obs.observation_date}\n` +
                                          `⚠️ स्थिति: ${obs.urgency_level}\n` +
                                          `❓ लक्षण: ${obs.symptoms}\n` +
                                          `💡 सलाह: ${obs.response_summary.slice(0, 300)}...`
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg font-bold text-[11px] transition"
                                        title="डॉक्टर को WhatsApp भेजें"
                                      >
                                        📱 शेयर
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Action buttons: Print & Delete */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                          <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            कार्ड प्रिंट / PDF
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`क्या आप ${animal.nickname} का रिकॉर्ड हटाना चाहते हैं?`)) {
                                deleteAnimal(animal.id);
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            कार्ड हटाएं (Delete)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
