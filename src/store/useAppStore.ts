import { create } from "zustand";
import type { ChatResponseMode } from "../lib/chat-modes";
import {
  loadChatHistory,
  loadLastCollection,
  saveChatHistory,
  saveLastCollection,
} from "../lib/storage";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isStreaming?: boolean;
  isError?: boolean;
  mode?: ChatResponseMode;
}

export interface CollectionInfo {
  name: string;
  document_count: number;
}

export interface IngestionState {
  status: "idle" | "running" | "completed" | "error";
  currentFile: string;
  current: number;
  total: number;
  chunksAdded: number;
  filesSkipped: number;
  fileErrors: number;
  error: string | null;
  progressPercent: number;
  collectionName: string | null;
}

export interface IngestionSummary {
  collectionName: string;
  filesProcessed: number;
  filesSkipped: number;
  chunksAdded: number;
}

interface AppState {
  messages: ChatMessage[];
  currentCollection: string | null;
  collections: CollectionInfo[];
  ingestionState: IngestionState;
  ingestionSummary: IngestionSummary | null;
  isStreaming: boolean;
  sidebarOpen: boolean;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, token: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  removeLastAssistantMessage: () => { question: string; mode: ChatResponseMode } | null;
  setCollection: (name: string | null) => void;
  setCollections: (collections: CollectionInfo[]) => void;
  setIngestionState: (state: Partial<IngestionState>) => void;
  resetIngestionState: () => void;
  setIngestionSummary: (summary: IngestionSummary | null) => void;
  setStreaming: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
}

const initialIngestionState: IngestionState = {
  status: "idle",
  currentFile: "",
  current: 0,
  total: 0,
  chunksAdded: 0,
  filesSkipped: 0,
  fileErrors: 0,
  error: null,
  progressPercent: 0,
  collectionName: null,
};

const restoredCollection = loadLastCollection();
const restoredMessages = restoredCollection ? loadChatHistory(restoredCollection) : [];

export const useAppStore = create<AppState>((set, get) => ({
  messages: restoredMessages,
  currentCollection: restoredCollection,
  collections: [],
  ingestionState: initialIngestionState,
  ingestionSummary: null,
  isStreaming: false,
  sidebarOpen: true,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, ...updates } : message,
      ),
    })),
  appendToMessage: (id, token) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, content: message.content + token } : message,
      ),
    })),
  setMessages: (messages) => {
    set({ messages });
    const { currentCollection } = get();
    if (currentCollection) {
      saveChatHistory(currentCollection, messages);
    }
  },
  clearMessages: () => {
    set({ messages: [] });
    const { currentCollection } = get();
    if (currentCollection) {
      saveChatHistory(currentCollection, []);
    }
  },
  removeLastAssistantMessage: () => {
    const { messages } = get();
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (lastAssistantIdx < 0) return null;

    const idx = messages.length - 1 - lastAssistantIdx;
    const userIdx = idx - 1;
    const userMessage = userIdx >= 0 && messages[userIdx]?.role === "user" ? messages[userIdx] : null;
    set({ messages: messages.slice(0, idx) });
    if (!userMessage) return null;
    return {
      question: userMessage.content,
      mode: userMessage.mode ?? "default",
    };
  },
  setCollection: (name) => {
    const state = get();
    if (state.currentCollection === name) return;

    if (state.currentCollection) {
      saveChatHistory(state.currentCollection, state.messages);
    }

    const messages = name ? loadChatHistory(name) : [];
    saveLastCollection(name);
    set({ currentCollection: name, messages });
  },
  setCollections: (collections) => {
    set({ collections });
    const { currentCollection } = get();
    if (currentCollection && !collections.some((item) => item.name === currentCollection)) {
      saveLastCollection(null);
      set({ currentCollection: null, messages: [] });
    }
  },
  setIngestionState: (updates) =>
    set((state) => ({
      ingestionState: { ...state.ingestionState, ...updates },
    })),
  resetIngestionState: () => set({ ingestionState: initialIngestionState }),
  setIngestionSummary: (summary) => set({ ingestionSummary: summary }),
  setStreaming: (value) => set({ isStreaming: value }),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
}));
