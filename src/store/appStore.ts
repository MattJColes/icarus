import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string;
}

interface ModelCapabilities {
  supportsThinking: boolean;
  supportsVision: boolean;
  contextLength?: number;
}

interface AppState {
  currentModel: string | null;
  currentModelCapabilities: ModelCapabilities | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  showThinking: boolean;
  ragEnabled: boolean;
  ragFolders: string[];
  installedModels: string[];
  isOllamaReady: boolean;

  setCurrentModel: (model: string) => void;
  setCurrentModelCapabilities: (capabilities: ModelCapabilities) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setShowThinking: (show: boolean) => void;
  setRagEnabled: (enabled: boolean) => void;
  setRagFolders: (folders: string[]) => void;
  setInstalledModels: (models: string[]) => void;
  setOllamaReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentModel: null,
      currentModelCapabilities: null,
      conversations: [],
      activeConversationId: null,
      showThinking: true,
      ragEnabled: false,
      ragFolders: [],
      installedModels: [],
      isOllamaReady: false,

      setCurrentModel: (model) => set({ currentModel: model }),
      setCurrentModelCapabilities: (capabilities) => set({ currentModelCapabilities: capabilities }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [...state.conversations, conversation],
          activeConversationId: conversation.id,
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: new Date() } : conv
          ),
        })),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        })),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                }
              : conv
          ),
        })),

      setShowThinking: (show) => set({ showThinking: show }),
      setRagEnabled: (enabled) => set({ ragEnabled: enabled }),
      setRagFolders: (folders) => set({ ragFolders: folders }),
      setInstalledModels: (models) => set({ installedModels: models }),
      setOllamaReady: (ready) => set({ isOllamaReady: ready }),
    }),
    {
      name: 'helios-app-store',
      partialize: (state) => ({
        currentModel: state.currentModel,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        showThinking: state.showThinking,
        ragEnabled: state.ragEnabled,
        ragFolders: state.ragFolders,
      }),
    }
  )
);