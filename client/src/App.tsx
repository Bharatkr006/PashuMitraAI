import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { ChatProvider } from "./context/ChatContext";
import { Header } from "./components/Header";
import { TabNavigation } from "./components/TabNavigation";
import { Sidebar } from "./components/Sidebar";
import { ChatTab } from "./components/ChatTab/ChatTab";
import { HealthCardTab } from "./components/HealthCardTab/HealthCardTab";
import { DashboardTab } from "./components/DashboardTab/DashboardTab";
import { AboutTab } from "./components/AboutTab/AboutTab";
import { LoginPage } from "./components/LoginPage";
import { Loader2 } from "lucide-react";

const MainContent: React.FC = () => {
  const { activeTab, fontSize, currentUser, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">पशुमित्र AI लोड हो रहा है...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const fontClass =
    fontSize === "xlarge"
      ? "text-lg [&_p]:text-base [&_h4]:text-lg [&_button]:text-base"
      : fontSize === "large"
      ? "text-base [&_p]:text-[15px] [&_h4]:text-base [&_button]:text-sm"
      : "";

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 transition-all ${fontClass}`}>
      <Header />
      <TabNavigation />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex">
        {/* Persistent Sidebar (Species & Animal selection) */}
        {activeTab === "chat" && <Sidebar />}

        {/* Tab content area */}
        <main className="flex-1 min-w-0">
          {activeTab === "chat" && <ChatTab />}
          {activeTab === "health-card" && <HealthCardTab />}
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "about" && <AboutTab />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ChatProvider>
        <MainContent />
      </ChatProvider>
    </AppProvider>
  );
};

export default App;
