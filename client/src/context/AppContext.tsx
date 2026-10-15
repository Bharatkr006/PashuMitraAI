import React, { createContext, useContext, useState, useEffect } from "react";
import { Animal, ResponseData, User } from "../types";
import {
  isFirebaseConfigured,
  firebaseEmailAuth,
  firebaseGoogleAuth,
  firebaseSignOut,
  subscribeToFirebaseAuth,
} from "../firebase";

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedAnimal: string | null;
  setSelectedAnimal: (animal: string | null) => void;
  languageMode: "hindi" | "rajasthani";
  setLanguageMode: (mode: "hindi" | "rajasthani") => void;
  animals: Animal[];
  refreshAnimals: () => Promise<void>;
  addAnimal: (nickname: string, species: string, age: string, notes: string) => Promise<number>;
  deleteAnimal: (id: number) => Promise<void>;
  lastResponse: ResponseData | null;
  setLastResponse: (resp: ResponseData | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  fontSize: "normal" | "large" | "xlarge";
  setFontSize: (size: "normal" | "large" | "xlarge") => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  activeSpeechMessageId: string | null;
  setActiveSpeechMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  currentUser: User | null;
  isAuthLoading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, name?: string, password?: string) => Promise<{ user: User; isNewUser: boolean }>;
  loginWithGoogle: () => Promise<{ user: User; isNewUser: boolean }>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<"hindi" | "rajasthani">("hindi");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lastResponse, setLastResponse] = useState<ResponseData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const refreshAnimals = async () => {
    try {
      const res = await fetch("/api/animals");
      if (res.ok) {
        const data = await res.json();
        setAnimals(data);
      }
    } catch (err) {
      console.error("Failed to load animals:", err);
    }
  };

  const addAnimal = async (
    nickname: string,
    species: string,
    age: string,
    notes: string
  ): Promise<number> => {
    const res = await fetch("/api/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, species, age, notes, consent: true }),
    });
    if (!res.ok) {
      throw new Error("Failed to add animal");
    }
    const data = await res.json();
    await refreshAnimals();
    return data.id;
  };

  const deleteAnimal = async (id: number) => {
    const res = await fetch(`/api/animals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to delete animal");
    }
    await refreshAnimals();
  };

  useEffect(() => {
    let unsubscribe = () => {};

    if (isFirebaseConfigured) {
      unsubscribe = subscribeToFirebaseAuth(async (fbUser) => {
        if (fbUser && fbUser.email) {
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: fbUser.email,
                name: fbUser.displayName || undefined,
              }),
            });
            const data = await res.json();
            if (data.success && data.user) {
              const combined: User = {
                ...data.user,
                firebaseUid: fbUser.uid,
              };
              setCurrentUser(combined);
              localStorage.setItem("pashumitra_user", JSON.stringify(combined));
            }
          } catch (e) {
            console.warn("Failed to sync firebase user with backend:", e);
          }
        } else {
          const savedUser = localStorage.getItem("pashumitra_user");
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              if (!parsed.firebaseUid) {
                setCurrentUser(parsed);
              } else {
                setCurrentUser(null);
                localStorage.removeItem("pashumitra_user");
              }
            } catch {}
          }
        }
        setIsAuthLoading(false);
      });
    } else {
      try {
        const savedUser = localStorage.getItem("pashumitra_user");
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn("Failed to restore saved user:", e);
      } finally {
        setIsAuthLoading(false);
      }
    }

    refreshAnimals();
    return () => unsubscribe();
  }, []);

  const login = async (
    email: string,
    name?: string,
    password?: string
  ): Promise<{ user: User; isNewUser: boolean }> => {
    let firebaseUid: string | undefined;
    let isNew = false;

    if (isFirebaseConfigured) {
      const fbResult = await firebaseEmailAuth(email, password);
      firebaseUid = fbResult.user.uid;
      isNew = fbResult.isNewUser;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name?.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "लॉगिन असफल रहा (Login failed)");
    }
    const combinedUser: User = {
      ...data.user,
      firebaseUid,
    };
    setCurrentUser(combinedUser);
    try {
      localStorage.setItem("pashumitra_user", JSON.stringify(combinedUser));
    } catch (e) {
      console.warn("Failed to store user in localStorage:", e);
    }
    return { user: combinedUser, isNewUser: isNew || data.isNewUser };
  };

  const loginWithGoogle = async (): Promise<{ user: User; isNewUser: boolean }> => {
    const fbResult = await firebaseGoogleAuth();
    const email = fbResult.user.email;
    if (!email) {
      throw new Error("Google login did not return an email.");
    }
    const name = fbResult.user.displayName || undefined;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Google login sync failed on server");
    }
    const combinedUser: User = {
      ...data.user,
      firebaseUid: fbResult.user.uid,
    };
    setCurrentUser(combinedUser);
    try {
      localStorage.setItem("pashumitra_user", JSON.stringify(combinedUser));
    } catch (e) {
      console.warn("Failed to store user in localStorage:", e);
    }
    return { user: combinedUser, isNewUser: fbResult.isNewUser || data.isNewUser };
  };

  const logout = () => {
    if (isFirebaseConfigured) {
      firebaseSignOut().catch((err) => console.warn("Firebase sign out error:", err));
    }
    try {
      localStorage.removeItem("pashumitra_user");
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (e) {
      console.warn("Failed to clear user in localStorage:", e);
    }
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedAnimal,
        setSelectedAnimal,
        languageMode,
        setLanguageMode,
        animals,
        refreshAnimals,
        addAnimal,
        deleteAnimal,
        lastResponse,
        setLastResponse,
        sidebarOpen,
        setSidebarOpen,
        fontSize,
        setFontSize,
        speechRate,
        setSpeechRate,
        activeSpeechMessageId,
        setActiveSpeechMessageId,
        currentUser,
        isAuthLoading,
        isFirebaseActive: isFirebaseConfigured,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
