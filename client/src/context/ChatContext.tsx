import React, { createContext, useContext, useState } from "react";
import { ChatMessage, ResponseData } from "../types";
import { useApp } from "./AppContext";

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (query: string) => Promise<void>;
  clearMessages: () => void;
  saveObservation: (animalId: number, query: string, summary: string, urgency: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function isResponseData(value: unknown): value is ResponseData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;
  return (
    typeof data.response_text === "string" &&
    typeof data.response_source === "string" &&
    typeof data.response_mode === "string" &&
    typeof data.response_path === "string" &&
    typeof data.response_path_reason === "string" &&
    typeof data.kb_urgency === "string" &&
    typeof data.llm_used === "boolean" &&
    typeof data.llm_latency_ms === "number" &&
    typeof data.total_latency_ms === "number" &&
    typeof data.kb_results_count === "number" &&
    Array.isArray(data.sources) &&
    Array.isArray(data.limitations) &&
    (typeof data.cannot_determine === "string" || data.cannot_determine === null) &&
    typeof data.when_to_see_vet === "string"
  );
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { selectedAnimal, languageMode, setLastResponse, refreshAnimals } = useApp();

  const sendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      content: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText.trim(),
          animal: selectedAnimal,
          languageMode,
          useLlm: true,
        }),
      });

      const responseData: unknown = await res.json();
      const responseFields = typeof responseData === "object" && responseData !== null
        ? responseData as Record<string, unknown>
        : {};
      if (!res.ok) {
        const hasResponseData = isResponseData(responseData);
        const assistantMessage: ChatMessage = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: typeof responseFields.response_text === "string"
            ? responseFields.response_text
            : "⚠️ उत्तर सेवा में तकनीकी समस्या है। कृपया थोड़ी देर बाद फिर कोशिश करें।",
          response_data: hasResponseData ? responseData : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev.slice(0, -1), userMessage, assistantMessage]);
        return;
      }
      const normalizedResponse: ResponseData = isResponseData(responseData)
        ? responseData
        : {
            response_text: typeof responseFields.response_text === "string" ? responseFields.response_text : "उत्तर उपलब्ध नहीं है।",
            response_source: typeof responseFields.response_source === "string" ? responseFields.response_source : "unknown",
            response_mode: typeof responseFields.response_mode === "string" ? responseFields.response_mode : "General",
            response_path: typeof responseFields.response_path === "string" ? responseFields.response_path : "offline fallback",
            response_path_reason: typeof responseFields.response_path_reason === "string" ? responseFields.response_path_reason : "general",
            kb_urgency: (responseFields.kb_urgency as any) || (responseFields.final_urgency as any) || "general",
            final_urgency: (responseFields.final_urgency as any) || "general",
            emergency_check: responseFields.emergency_check as any,
            llm_used: Boolean(responseFields.llm_used),
            llm_error_category: responseFields.llm_error_category as any,
            llm_latency_ms: typeof responseFields.llm_latency_ms === "number" ? responseFields.llm_latency_ms : 0,
            total_latency_ms: typeof responseFields.total_latency_ms === "number" ? responseFields.total_latency_ms : 0,
            kb_results_count: typeof responseFields.kb_results_count === "number" ? responseFields.kb_results_count : 0,
            sources: Array.isArray(responseFields.sources) ? (responseFields.sources as any) : [],
            limitations: Array.isArray(responseFields.limitations) ? (responseFields.limitations as any) : [],
            cannot_determine: typeof responseFields.cannot_determine === "string" ? responseFields.cannot_determine : null,
            when_to_see_vet: typeof responseFields.when_to_see_vet === "string" ? responseFields.when_to_see_vet : "पशु चिकित्सक से सलाह लें।",
            dialect_info: responseFields.dialect_info as any,
            groq_model: typeof responseFields.groq_model === "string" ? responseFields.groq_model : null,
          };

      setLastResponse(normalizedResponse);

      // Attach dialect info to user message if present
      if (normalizedResponse.dialect_info) {
        userMessage.dialect_info = normalizedResponse.dialect_info;
      }

      const assistantMessage: ChatMessage = {
        id: "msg-" + Date.now() + "-assistant",
        role: "assistant",
        content: normalizedResponse.response_text,
        response_data: normalizedResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev.slice(0, -1), userMessage, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "⚠️ क्षमा करें, तकनीकी समस्या के कारण उत्तर नहीं मिल पाया। कृपया पुनः प्रयास करें।",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setLastResponse(null);
  };

  const saveObservation = async (
    animalId: number,
    query: string,
    summary: string,
    urgency: string
  ) => {
    const res = await fetch("/api/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animalId,
        symptoms: query,
        query,
        responseSummary: summary.slice(0, 500),
        urgencyLevel: urgency,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to save observation");
    }
    await refreshAnimals();
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        clearMessages,
        saveObservation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
