import React, { useState } from "react";
import { X, Check, BookmarkPlus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useChat } from "../../context/ChatContext";
import { ResponseData } from "../../types";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  responseData: ResponseData;
  userQuery: string;
}

export const SaveConsultationModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  responseData,
  userQuery,
}) => {
  const { animals, addAnimal } = useApp();
  const { saveObservation } = useChat();

  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(
    animals[0]?.id || null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newSpecies, setNewSpecies] = useState("cattle");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    let animalId = selectedAnimalId;

    setIsSaving(true);
    try {
      if (showAddForm || !animalId) {
        if (!newNickname.trim()) return;
        animalId = await addAnimal(newNickname, newSpecies, "", "Added from consultation");
      }

      await saveObservation(
        animalId!,
        userQuery,
        responseData.response_text,
        responseData.final_urgency || "general"
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
            <BookmarkPlus className="w-5 h-5 text-emerald-600" />
            <span>स्वास्थ्य कार्ड में सुरक्षित करें</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800">सफलतापूर्वक सेव हो गया!</p>
            <p className="text-xs text-slate-500">पशु स्वास्थ्य कार्ड में विवरण जुड़ चुका है।</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-600">
              यह परामर्श किस पशु के स्वास्थ्य कार्ड में जोड़ना चाहते हैं?
            </p>

            {animals.length > 0 && !showAddForm ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">पशु चुनें:</label>
                <select
                  value={selectedAnimalId || ""}
                  onChange={(e) => setSelectedAnimalId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname} ({a.species})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-emerald-700 hover:underline font-semibold block pt-1"
                >
                  + नया पशु बनाएं
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700">नया पशु जोड़ें:</div>
                <div>
                  <input
                    type="text"
                    placeholder="पशु का नाम (e.g. Ganga)"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  {["cattle", "buffalo", "goat", "sheep"].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setNewSpecies(sp)}
                      className={`flex-1 py-1 text-xs rounded-lg font-medium capitalize border ${
                        newSpecies === sp
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
                {animals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-500 hover:underline block"
                  >
                    मौजूदा सूची में से चुनें
                  </button>
                )}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
              <span className="font-semibold block text-slate-700">परामर्श सारांश:</span>
              <p className="line-clamp-2 mt-0.5">{responseData.response_text}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                रद्द करें
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition"
              >
                {isSaving ? "सेव हो रहा है..." : "कार्ड में जोड़ें"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
