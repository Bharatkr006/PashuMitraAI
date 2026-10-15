import React from "react";
import { MessageSquare, CreditCard, BarChart2, Info } from "lucide-react";
import { useApp } from "../context/AppContext";

export const TabNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const tabs = [
    {
      id: "chat",
      label: "बातचीत (Chat)",
      sublabel: "परामर्श व प्राथमिक सहायता",
      icon: MessageSquare,
      color: "text-emerald-700",
      activeBg: "bg-emerald-600 text-white",
    },
    {
      id: "health-card",
      label: "स्वास्थ्य कार्ड (Cards)",
      sublabel: "पशु रिकॉर्ड व इतिहास",
      icon: CreditCard,
      color: "text-blue-700",
      activeBg: "bg-blue-600 text-white",
    },
    {
      id: "dashboard",
      label: "डैशबोर्ड (Dashboard)",
      sublabel: "मूल्यांकन व प्रदर्शन",
      icon: BarChart2,
      color: "text-amber-700",
      activeBg: "bg-amber-600 text-white",
    },
    {
      id: "about",
      label: "जानकारी (About)",
      sublabel: "मिशन व संदर्भ",
      icon: Info,
      color: "text-purple-700",
      activeBg: "bg-purple-600 text-white",
    },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-[69px] z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl font-medium transition-all text-sm whitespace-nowrap shrink-0 ${
                  isActive
                    ? `${tab.activeBg} shadow-sm font-semibold`
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : tab.color}`} />
                <div className="text-left">
                  <div className="leading-tight">{tab.label}</div>
                  <div className={`text-[10px] hidden md:block ${isActive ? "text-white/80" : "text-slate-400"}`}>
                    {tab.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
