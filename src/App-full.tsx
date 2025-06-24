import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { SettingsPanel } from './components/SettingsPanel';
import { Message as MessageComponent } from './components/Message';
import { useFileHandling } from './hooks/useFileHandling';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;
  ragContext?: boolean;
  attachments?: FileAttachment[];
  clarifyingQuestions?: string[];
  isResponse?: boolean;
  originalQuery?: string;
  ragSources?: RagSource[];
  documentType?: string;
  informationNeeded?: string[];
  informationSummary?: string;
  readyToProceed?: boolean;
}

interface RagSource {
  fileName: string;
  filePath: string;
  excerpt: string;
}

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content?: string;
  base64?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface Settings {
  showThinking: boolean;
  ragEnabled: boolean;
  ragDirectories: string[];  // Changed from single directory to array of up to 3
  ragSensitivity: number;    // Minimum score threshold (0-100)
  selectedModel: string;
  systemPrompt: string;      // User-defined system prompt
  // Model parameters
  temperature: number;
  contextLength: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
}

// Removed unused ModelInfo interface

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// Utility function to format bytes for display
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface QueuedMessage {
  id: string;
  content: string;
  attachments: FileAttachment[];
  timestamp: Date;
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat');
  const [settings, setSettings] = useState<Settings>({
    showThinking: false,
    ragEnabled: false,
    ragDirectories: [],
    ragSensitivity: 70,
    selectedModel: '',
    systemPrompt: 'You are Icarus, a expert chatbot. Keep answers short and concise.',
    temperature: 0.7,
    contextLength: 40000,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelSupportsThinking, setModelSupportsThinking] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{content: string, thinking: string} | null>(null);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [ragStatus, setRagStatus] = useState<{isIndexing: boolean, documentCount: number, lastIndexed: number, message?: string, indexingProgress?: number}>({
    isIndexing: false,
    documentCount: 0,
    lastIndexed: 0,
    indexingProgress: 0
  });
  const fileHandling = useFileHandling();
  const [installProgress, setInstallProgress] = useState<{installing: boolean, message: string}>({
    installing: false,
    message: ''
  });
  const [currentRagSources, setCurrentRagSources] = useState<RagSource[]>([]);
  // Removed unused isThinking state
  const [matchingDocuments, setMatchingDocuments] = useState<{documents: RagSource[], searchTerms: string[], totalMatches: number}>({
    documents: [],
    searchTerms: [],
    totalMatches: 0
  });
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  // Close file viewer with Escape key is now handled by useFileHandling hook

  // Load settings and models on startup
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Initializing Icarus app...');
      
      // Load settings first
      const loadedSettings = await loadSettings();
      console.log('Loaded settings result:', loadedSettings);
      
      if (loadedSettings) {
        console.log('Force updating settings state with loaded settings:', loadedSettings);
        // Force a direct state update to ensure it takes effect
        setSettings(() => {
          const forcedSettings = JSON.parse(JSON.stringify(loadedSettings));
          console.log('Forcing settings state to:', forcedSettings);
          return forcedSettings;
        });
        
        // Verify the state was set by checking after a timeout
        setTimeout(() => {
          console.log('Settings state after force update should be:', loadedSettings);
        }, 100);
      }
      
      // Then load models
      await loadOllamaModels();
      
      // Load conversations
      await loadConversations();
      
      console.log('App initialization complete');
    };
    
    initializeApp();
  }, []);

  // Check model thinking support and auto-set context length when model changes
  useEffect(() => {
    if (settings.selectedModel) {
      checkModelThinkingSupport(settings.selectedModel);
      autoSetContextLength(settings.selectedModel);
    }
  }, [settings.selectedModel]);

  // Debug: Monitor settings changes
  useEffect(() => {
    console.log('Settings state updated:', {
      contextLength: settings.contextLength,
      temperature: settings.temperature,
      ragDirectories: settings.ragDirectories,
      settingsLoaded
    });
  }, [settings, settingsLoaded]);

  // Set up streaming and RAG listeners
  useEffect(() => {
    if (window.electron) {
      window.electron.on('ollama:chat:stream', (data: any) => {
        // Ignore streaming updates when generating titles
        if (isGeneratingTitle) {
          return;
        }
        
        if (data.message) {
          setStreamingMessage(prev => ({
            content: (prev?.content || '') + (data.message.content || ''),
            thinking: (prev?.thinking || '') + (data.message.thinking || '')
          }));
          
        }
        
      });

      window.electron.on('rag:indexing-status', (status: any) => {
        setRagStatus(prev => ({
          ...prev,
          ...status
        }));
      });

      window.electron.on('rag:full-clear', (clearData: any) => {
        console.log('Received comprehensive RAG clear event:', clearData);
        
        // Clear all RAG state comprehensively
        setRagStatus({
          isIndexing: false,
          documentCount: 0,
          lastIndexed: 0,
          indexingProgress: 0
        });
        
        setCurrentRagSources([]);
        setMatchingDocuments({
          documents: [],
          searchTerms: [],
          totalMatches: 0
        });
        
        // Clear settings if indicated
        if (clearData.clearAllData) {
          setSettings(prev => ({
            ...prev,
            ragEnabled: false,
            ragDirectories: [],
            ragSensitivity: 70
          }));
        }
      });

      window.electron.on('ollama:install-progress', (progress: any) => {
        setInstallProgress({
          installing: progress.status !== 'success' && progress.status !== 'error',
          message: progress.message || `Status: ${progress.status}`
        });
      });

      window.electron.on('ollama:pull:progress', (progress: any) => {
        console.log('Model pull progress:', progress);
        
        if (progress.status === 'downloading' || progress.status === 'pulling') {
          const percent = progress.completed && progress.total ? 
            Math.round((progress.completed / progress.total) * 100) : 0;
          
          setInstallProgress({
            installing: true,
            message: `Downloading model... ${percent}% (${formatBytes(progress.completed || 0)} / ${formatBytes(progress.total || 0)})`
          });
        } else if (progress.status === 'verifying digest') {
          setInstallProgress({
            installing: true,
            message: 'Verifying model integrity...'
          });
        } else if (progress.status === 'writing manifest') {
          setInstallProgress({
            installing: true,
            message: 'Finalizing installation...'
          });
        } else if (progress.status === 'success') {
          setInstallProgress({
            installing: false,
            message: 'Model installed successfully!'
          });
        } else if (progress.status === 'error') {
          setInstallProgress({
            installing: false,
            message: `Installation failed: ${progress.error || 'Unknown error'}`
          });
        } else {
          setInstallProgress({
            installing: true,
            message: progress.status || 'Installing model...'
          });
        }
      });

      window.electron.on('rag:sources-found', (data: any) => {
        console.log('RAG sources found:', data.sources);
        const transformedSources = (data.sources || []).map((source: any) => ({
          fileName: source.file,
          filePath: source.file,
          excerpt: source.content.substring(0, 200) + (source.content.length > 200 ? '...' : '')
        }));
        setCurrentRagSources(transformedSources);
      });

      window.electron.on('rag:matching-documents', (data: any) => {
        console.log('Matching documents:', data);
        const transformedDocs = (data.documents || []).map((doc: any) => ({
          fileName: doc.file,
          filePath: doc.file,
          excerpt: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : '')
        }));
        setMatchingDocuments({
          documents: transformedDocs,
          searchTerms: data.searchTerms || [],
          totalMatches: data.totalMatches || 0
        });
      });

      return () => {
        window.electron.removeAllListeners('ollama:chat:stream');
        window.electron.removeAllListeners('rag:indexing-status');
        window.electron.removeAllListeners('ollama:install-progress');
        window.electron.removeAllListeners('rag:sources-found');
        window.electron.removeAllListeners('rag:matching-documents');
      };
    }
  }, [isGeneratingTitle]);

  const loadSettings = async () => {
    try {
      if (window.electron) {
        const savedSettings = await window.electron.invoke('settings:load');
        console.log('Loaded settings from file:', savedSettings);
        
        // Create default settings template, then apply saved settings
        const defaultSettings = {
          showThinking: false,
          ragEnabled: false,
          ragDirectories: [],
          ragSensitivity: 70,
          selectedModel: '',
          systemPrompt: 'You are Icarus, a expert chatbot. Keep answers short and concise.',
          temperature: 0.7,
          contextLength: 2048,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1
        };
        
        // Merge with defaults to ensure all properties are present, but prioritize saved values
        let mergedSettings = {
          ...defaultSettings, // fallback defaults
          ...savedSettings // override with actual saved values
        };
        
        // Handle migration from old ragDirectory to ragDirectories
        if (savedSettings.ragDirectory && !savedSettings.ragDirectories) {
          mergedSettings = {
            ...mergedSettings,
            ragDirectories: [savedSettings.ragDirectory]
          };
          console.log('Migrated ragDirectory to ragDirectories:', mergedSettings.ragDirectories);
        }
        
        console.log('About to set settings state with:', mergedSettings);
        
        // Force a completely new object reference to ensure React detects the change
        const freshSettings = JSON.parse(JSON.stringify(mergedSettings));
        
        // Use functional update to ensure state is set properly
        setSettings((prevSettings) => {
          console.log('Previous settings state:', prevSettings);
          console.log('New settings to apply:', freshSettings);
          // Return a completely new object to guarantee React re-renders
          return { ...freshSettings };
        });
        
        setSettingsLoaded(true);
        console.log('Settings loaded and applied:', mergedSettings);
        
        // Update RAG status if directories are set
        if (mergedSettings.ragDirectories && mergedSettings.ragDirectories.length > 0) {
          console.log('Checking RAG status for directories:', mergedSettings.ragDirectories);
          // Check current RAG status
          setTimeout(() => {
            if (window.electron) {
              window.electron.invoke('rag:status').then((status: any) => {
                console.log('RAG status loaded:', status);
                setRagStatus(prev => ({
                  ...prev,
                  ...status
                }));
              });
            }
          }, 1000);
        }
        
        return mergedSettings;
      } else {
        // Fallback to localStorage when electron is not available
        const saved = localStorage.getItem('helios-settings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          const defaultSettings = {
            showThinking: false,
            ragEnabled: false,
            ragDirectories: [],
            ragSensitivity: 70,
            selectedModel: '',
            systemPrompt: 'You are Icarus, a expert chatbot. Keep answers short and concise.',
            temperature: 0.7,
            contextLength: 2048,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1
          };
          const mergedSettings = {
            ...defaultSettings,
            ...parsedSettings
          };
          setSettings(() => mergedSettings);
          setSettingsLoaded(true);
          console.log('Loaded settings from localStorage:', mergedSettings);
          return mergedSettings;
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('helios-settings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          const defaultSettings = {
            showThinking: false,
            ragEnabled: false,
            ragDirectories: [],
            ragSensitivity: 70,
            selectedModel: '',
            temperature: 0.7,
            contextLength: 2048,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1
          };
          const mergedSettings = {
            ...defaultSettings,
            ...parsedSettings
          };
          setSettings(() => mergedSettings);
          setSettingsLoaded(true);
          console.log('Loaded settings from localStorage fallback:', mergedSettings);
          return mergedSettings;
        }
      } catch (fallbackError) {
        console.error('Failed to load settings from localStorage:', fallbackError);
      }
    }
    
    console.log('Using default settings');
    const defaultSettings = {
      showThinking: false,
      ragEnabled: false,
      ragDirectories: [],
      ragSensitivity: 70,
      selectedModel: '',
      systemPrompt: 'You are Icarus, a expert chatbot. Keep answers short and concise.',
      temperature: 0.7,
      contextLength: 2048,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1
    };
    setSettings(() => defaultSettings);
    setSettingsLoaded(true);
    return defaultSettings;
  };

  const saveSettings = async (newSettings: Settings) => {
    // Force a completely new object reference to ensure React detects the change
    const freshSettings = JSON.parse(JSON.stringify(newSettings));
    
    // Always update local state with functional update
    setSettings((prev) => {
      console.log('Updating settings state from:', prev, 'to:', freshSettings);
      return { ...freshSettings };
    });
    
    // But don't persist to disk until settings have been loaded to prevent overwriting with defaults
    if (!settingsLoaded) {
      console.log('Skipping settings persist - settings not yet loaded from disk');
      return;
    }
    
    try {
      if (window.electron) {
        await window.electron.invoke('settings:save', newSettings);
        console.log('Settings saved to file:', newSettings);
      } else {
        localStorage.setItem('helios-settings', JSON.stringify(newSettings));
        console.log('Settings saved to localStorage:', newSettings);
      }
    } catch (error) {
      console.error('Failed to save settings to file:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem('helios-settings', JSON.stringify(newSettings));
        console.log('Settings saved to localStorage fallback:', newSettings);
      } catch (fallbackError) {
        console.error('Failed to save settings to localStorage:', fallbackError);
      }
    }
  };

  const loadConversations = async () => {
    try {
      if (window.electron) {
        const savedConversations = await window.electron.invoke('conversations:load');
        console.log('Loaded conversations from file:', savedConversations);
        
        if (savedConversations && Array.isArray(savedConversations)) {
          // Ensure dates are properly restored from string format
          const restoredConversations = savedConversations.map(conv => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          
          setConversations(restoredConversations);
          console.log('Conversations restored:', restoredConversations.length);
          return restoredConversations;
        }
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('helios-conversations');
        if (saved) {
          const parsedConversations = JSON.parse(saved);
          const restoredConversations = parsedConversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          setConversations(restoredConversations);
          console.log('Conversations loaded from localStorage:', restoredConversations.length);
          return restoredConversations;
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Try localStorage fallback
      try {
        const saved = localStorage.getItem('helios-conversations');
        if (saved) {
          const parsedConversations = JSON.parse(saved);
          const restoredConversations = parsedConversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          setConversations(restoredConversations);
          console.log('Conversations loaded from localStorage fallback:', restoredConversations.length);
          return restoredConversations;
        }
      } catch (fallbackError) {
        console.error('Failed to load conversations from localStorage:', fallbackError);
      }
    }
    
    console.log('No saved conversations found, starting with empty list');
    return [];
  };

  const saveConversations = async (conversationsToSave: Conversation[]) => {
    try {
      if (window.electron) {
        await window.electron.invoke('conversations:save', conversationsToSave);
        console.log('Conversations saved to file:', conversationsToSave.length);
      } else {
        localStorage.setItem('helios-conversations', JSON.stringify(conversationsToSave));
        console.log('Conversations saved to localStorage:', conversationsToSave.length);
      }
    } catch (error) {
      console.error('Failed to save conversations to file:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem('helios-conversations', JSON.stringify(conversationsToSave));
        console.log('Conversations saved to localStorage fallback:', conversationsToSave.length);
      } catch (fallbackError) {
        console.error('Failed to save conversations to localStorage:', fallbackError);
      }
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    
    // If we deleted the active conversation, switch to the most recent one or clear
    if (activeConversationId === conversationId) {
      const newActiveId = updatedConversations.length > 0 ? updatedConversations[0].id : null;
      setActiveConversationId(newActiveId);
    }
    
    // Save the updated list
    await saveConversations(updatedConversations);
  };

  const clearAllConversations = async () => {
    setConversations([]);
    setActiveConversationId(null);
    await saveConversations([]);
  };


  const generateChatTitle = async (messages: Message[]): Promise<string> => {
    if (!settings.selectedModel || messages.length === 0) return 'New Chat';
    
    try {
      // Set flag to prevent streaming UI updates
      setIsGeneratingTitle(true);
      
      // Get the first few messages for context
      const contextMessages = messages.slice(0, 3).map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 200) // Limit content length
      }));
      
      const titlePrompt = {
        role: 'user',
        content: `Based on this conversation, generate a short, descriptive title (max 4 words). Only respond with the title, nothing else:\n\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
      };
      
      if (window.electron) {
        const response = await window.electron.invoke('ollama:chat', {
          model: settings.selectedModel,
          messages: [titlePrompt],
          think: false,
          ragEnabled: false,
          options: {
            temperature: 0.3,
            num_ctx: 512,
            top_p: 0.8
          }
        });
        
        const title = response[0]?.message?.content || 'New Chat';
        return title.trim().replace(/['"]/g, '').substring(0, 50);
      }
    } catch (error) {
      console.error('Failed to generate chat title:', error);
    } finally {
      // Always clear the flag
      setIsGeneratingTitle(false);
    }
    
    // Fallback to using first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 30).trim() + (firstUserMessage.content.length > 30 ? '...' : '');
    }
    
    return 'New Chat';
  };

  const loadOllamaModels = async () => {
    try {
      if (window.electron) {
        console.log('Requesting Ollama models...');
        const models = await window.electron.invoke('ollama:list');
        console.log('Received models:', models);
        setAvailableModels(models);
        
        // Validate saved model still exists, or auto-select qwen3:4b as default
        if (models.length > 0) {
          let currentSettings = settings;
          
          // Get current settings state after potential loading
          const loadedSettingsCheck = await window.electron.invoke('settings:load');
          if (loadedSettingsCheck && loadedSettingsCheck.selectedModel) {
            currentSettings = loadedSettingsCheck;
            console.log('Using loaded settings for model validation:', currentSettings);
          }
          
          let modelToSelect = currentSettings.selectedModel;
          
          // Check if saved model still exists
          if (currentSettings.selectedModel) {
            const savedModelExists = models.some((m: any) => m.name === currentSettings.selectedModel);
            if (!savedModelExists) {
              console.log('Saved model no longer available:', currentSettings.selectedModel);
              modelToSelect = '';
            } else {
              console.log('Restored saved model:', currentSettings.selectedModel);
            }
          }
          
          // Auto-select default if no valid model selected
          if (!modelToSelect) {
            const preferredModel = models.find((m: any) => m.name.includes('qwen3:4b')) || 
                                   models.find((m: any) => m.name.includes('qwen3')) ||
                                   models.find((m: any) => m.name.includes('deepseek')) ||
                                   models.find((m: any) => m.name.includes('qwen2.5:8b')) ||
                                   models.find((m: any) => m.name.includes('qwen')) ||
                                   models[0];
            modelToSelect = preferredModel.name;
            console.log('Auto-selected default model:', modelToSelect);
            
            // Only update if we're changing the model
            if (modelToSelect !== currentSettings.selectedModel) {
              const newSettings = { ...currentSettings, selectedModel: modelToSelect };
              await saveSettings(newSettings);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to load models:', error);
      alert(`Failed to load Ollama models: ${error.message}\n\nPlease ensure:\n1. Ollama is installed\n2. Ollama is running\n3. You have downloaded at least one model`);
    }
  };

  const checkModelThinkingSupport = async (modelName: string) => {
    try {
      if (window.electron) {
        console.log('Checking model capabilities for:', modelName);
        const modelInfo = await window.electron.invoke('ollama:model-info', modelName);
        console.log('Model info received:', modelInfo);
        setModelSupportsThinking(modelInfo.supportsThinking);
        
        // Check if model supports images (vision models)
        const supportsImages = modelName.toLowerCase().includes('vision') ||
                              modelName.toLowerCase().includes('visual') ||
                              modelName.toLowerCase().includes('llava') ||
                              modelName.toLowerCase().includes('minicpm') ||
                              modelName.toLowerCase().includes('bakllava') ||
                              modelName.toLowerCase().includes('moondream') ||
                              modelName.toLowerCase().includes('qwen2-vl') ||
                              modelName.toLowerCase().includes('qwen2.5-vision') ||
                              modelName.toLowerCase().includes('qwen-vl') ||
                              modelName.toLowerCase().includes('gemma2-vision') ||
                              modelName.toLowerCase().includes('gemma-vision') ||
                              modelName.toLowerCase().includes('pixtral') ||
                              modelName.toLowerCase().includes('internvl') ||
                              modelName.toLowerCase().includes('cogvlm') ||
                              (modelInfo.details?.family && 
                               ['llava', 'minicpm', 'moondream', 'qwen-vl', 'qwen2-vl', 'gemma2', 'pixtral', 'internvl', 'cogvlm'].some(family => 
                                 modelInfo.details.family.toLowerCase().includes(family)));
        
        fileHandling.checkModelSupportsImages(modelName);
        console.log('Model supports thinking:', modelInfo.supportsThinking, 'images:', supportsImages);
      }
    } catch (error) {
      console.error('Failed to check model capabilities:', error);
      setModelSupportsThinking(false);
      fileHandling.checkModelSupportsImages('');
    }
  };

  const trimMessagesToContextLength = (messages: any[], contextLength: number) => {
    // Aggressive token estimation - over-eager to trim for safety
    const estimateTokens = (text: string): number => {
      // Method 1: Conservative character-based (2.5 chars per token)
      let charEstimate = text.length / 2.5;
      
      // Method 2: Word-based with penalties
      const words = text.split(/\s+/).filter(word => word.length > 0);
      let wordEstimate = words.length * 1.2; // 1.2 tokens per word
      
      // Add penalties for complexity
      const longWords = words.filter(word => word.length > 8).length;
      wordEstimate += longWords * 0.5; // Long words split into multiple tokens
      
      // Method 3: Content-type penalties
      let penalty = 1;
      if (text.includes('\n')) penalty += 0.1; // Newlines
      if (text.match(/[^\x00-\x7F]/)) penalty += 0.2; // Unicode characters
      if (text.includes('```') || text.includes('function') || text.includes('const')) penalty += 0.3; // Code
      if (text.match(/\d+/)) penalty += 0.1; // Numbers
      if (text.match(/[^\w\s]/g)) penalty += 0.15; // Special characters
      
      charEstimate *= penalty;
      wordEstimate *= penalty;
      
      // Use the highest estimate (most conservative)
      return Math.ceil(Math.max(charEstimate, wordEstimate));
    };
    
    // Reserve 20% of context for system prompts and safety margin
    const availableTokens = Math.floor(contextLength * 0.8);
    
    // Always preserve the last message (current user input)
    if (messages.length === 0) return messages;
    
    const lastMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);
    
    // Calculate total token count
    let totalTokens = estimateTokens(lastMessage.content);
    const trimmedMessages = [lastMessage];
    
    // Add previous messages from most recent to oldest until we hit the limit
    // Priority: user message (preserved) > recent chat history > older history
    for (let i = previousMessages.length - 1; i >= 0; i--) {
      const message = previousMessages[i];
      const messageTokens = estimateTokens(message.content);
      
      if (totalTokens + messageTokens <= availableTokens) {
        totalTokens += messageTokens;
        trimmedMessages.unshift(message);
      } else {
        // If we can't fit the whole message, try to include a truncated version
        const remainingTokens = availableTokens - totalTokens;
        if (remainingTokens > 50) { // Only truncate if we have reasonable space
          // Estimate how many characters we can fit
          const allowedChars = Math.floor(remainingTokens * 2.0); // Conservative conversion back
          const truncatedContent = message.content.substring(0, allowedChars - 20) + '...[truncated]';
          const truncatedTokens = estimateTokens(truncatedContent);
          
          if (totalTokens + truncatedTokens <= availableTokens) {
            trimmedMessages.unshift({
              ...message,
              content: truncatedContent
            });
            totalTokens += truncatedTokens;
          }
        }
        break; // Stop adding more messages
      }
    }
    
    console.log(`Context trimming: ${messages.length} → ${trimmedMessages.length} messages, ~${totalTokens}/${availableTokens} tokens (${Math.round((totalTokens/contextLength)*100)}% of total context)`);
    return trimmedMessages;
  };

  const autoSetContextLength = async (modelName: string) => {
    try {
      if (window.electron) {
        const modelInfo = await window.electron.invoke('ollama:model-info', modelName);
        console.log('Auto-setting context length for model:', modelName, 'detected:', modelInfo.contextLength);
        
        if (modelInfo.contextLength && modelInfo.contextLength !== settings.contextLength) {
          const newSettings = { ...settings, contextLength: modelInfo.contextLength };
          setSettings(newSettings);
          await window.electron.invoke('settings:save', newSettings);
          console.log('Context length auto-updated to:', modelInfo.contextLength);
        }
      }
    } catch (error) {
      console.error('Failed to auto-set context length:', error);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewConversation = async () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    };
    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setActiveConversationId(newConversation.id);
    setCurrentView('chat');
    
    // Clear all UI state for a truly blank chat
    setInput('');
    fileHandling.clearAttachments();
    setStreamingMessage(null);
    setCurrentRagSources([]);
    setMatchingDocuments({
      documents: [],
      searchTerms: [],
      totalMatches: 0
    });
    
    // Save conversations
    await saveConversations(updatedConversations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !settings.selectedModel) return;

    // If currently processing a message, add to queue instead
    if (isLoading) {
      const queuedMessage: QueuedMessage = {
        id: Date.now().toString(),
        content: input,
        attachments: [...fileHandling.attachedFiles],
        timestamp: new Date()
      };
      
      console.log('Adding message to queue:', queuedMessage.content.substring(0, 50) + '...');
      setMessageQueue(prev => {
        const newQueue = [...prev, queuedMessage];
        console.log('Queue updated, new length:', newQueue.length);
        return newQueue;
      });
      setInput('');
      fileHandling.clearAttachments();
      return;
    }

    // Process the message immediately
    const messageContent = input;
    const attachments = [...fileHandling.attachedFiles];
    setInput('');
    fileHandling.clearAttachments();
    await processMessage(messageContent, attachments);
  };

  const processMessage = async (messageContent: string, attachments: FileAttachment[]) => {
    let conversationId = activeConversationId;
    let currentConversations = conversations;
    
    // Create new conversation if none exists
    if (!conversationId) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: input.slice(0, 50),
        messages: [],
        createdAt: new Date()
      };
      currentConversations = [newConversation, ...conversations];
      setConversations(currentConversations);
      conversationId = newConversation.id;
      setActiveConversationId(conversationId);
      
      // Save the new conversation immediately
      await saveConversations(currentConversations);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    // Add user message to the current conversations (which includes any newly created conversation)
    const conversationsWithUserMessage = currentConversations.map(conv => 
      conv.id === conversationId 
        ? { ...conv, messages: [...conv.messages, userMessage] }
        : conv
    );
    setConversations(conversationsWithUserMessage);
    
    // Save conversations after adding user message
    await saveConversations(conversationsWithUserMessage);

    const currentInput = messageContent;
    const currentAttachments = [...attachments];
    console.log('Setting isLoading to true, starting message processing');
    setIsLoading(true);
    setStreamingMessage({ content: '', thinking: '' });
    setCurrentRagSources([]);
    setMatchingDocuments({ documents: [], searchTerms: [], totalMatches: 0 });
    // Removed setIsThinking call
    

    try {
      // Get conversation history
      const conversation = conversationsWithUserMessage.find(c => c.id === conversationId);
      
      // Prepare user message with attachments
      let userContent = currentInput;
      if (currentAttachments.length > 0) {
        const attachmentTexts = currentAttachments.map(att => {
          if (att.type.startsWith('text/') || att.name.endsWith('.md') || att.name.endsWith('.txt')) {
            return `\n\n--- File: ${att.name} ---\n${att.content}\n--- End of ${att.name} ---`;
          } else {
            return `\n\n--- File: ${att.name} (${att.type}, ${(att.size / 1024).toFixed(1)}KB) ---\n[File content attached as ${att.type}]\n${att.content}\n--- End of ${att.name} ---`;
          }
        }).join('');
        userContent = currentInput + attachmentTexts;
      }

      
      const messages = [
        ...(conversation?.messages || []).map(m => {
          let content = m.content;
          if (m.attachments) {
            const attachmentTexts = m.attachments.map(att => {
              if (att.type.startsWith('text/') || att.name.endsWith('.md') || att.name.endsWith('.txt')) {
                return `\n\n--- File: ${att.name} ---\n${att.content}\n--- End of ${att.name} ---`;
              } else {
                return `\n\n--- File: ${att.name} (${att.type}, ${(att.size / 1024).toFixed(1)}KB) ---\n[File content attached]\n--- End of ${att.name} ---`;
              }
            }).join('');
            content = m.content + attachmentTexts;
          }
          return {
            role: m.role,
            content: content
          };
        }),
        { role: 'user', content: userContent }
      ];

      // Trim messages to fit within context length
      const trimmedMessages = trimMessagesToContextLength(messages, settings.contextLength);

      // Document mode removed - using standard messages
      let enhancedMessages = [...trimmedMessages];

      // Add user-defined system prompt if provided
      if (settings.systemPrompt && settings.systemPrompt.trim()) {
        enhancedMessages.unshift({
          role: 'system',
          content: settings.systemPrompt.trim()
        });
      }

      // Call Ollama via Electron IPC with streaming
      if (window.electron) {
        const response = await window.electron.invoke('ollama:chat', {
          model: settings.selectedModel,
          messages: enhancedMessages,
          think: settings.showThinking && modelSupportsThinking, // Only send think if model supports it
          ragEnabled: settings.ragEnabled, // Pass RAG setting to backend
          // Model parameters
          options: {
            temperature: settings.temperature,
            num_ctx: settings.contextLength,
            top_p: settings.topP,
            top_k: settings.topK,
            repeat_penalty: settings.repeatPenalty
          }
        });

        // Final message after streaming is complete
        const responseContent = response[0]?.message?.content || streamingMessage?.content || 'No response received';
        
        // Parse structured sections if turn-based thinking is enabled
        let clarifyingQuestions: string[] | undefined = undefined;
        let documentType: string | undefined = undefined;
        let informationNeeded: string[] | undefined = undefined;
        let informationSummary: string | undefined = undefined;
        let readyToProceed: boolean | undefined = undefined;
        let finalContent = responseContent;
        

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalContent,
          timestamp: new Date(),
          thinking: response[0]?.message?.thinking || streamingMessage?.thinking || undefined,
          ragContext: settings.ragEnabled, // Mark if RAG was enabled for this response
          clarifyingQuestions: clarifyingQuestions,
          originalQuery: clarifyingQuestions ? currentInput : undefined,
          ragSources: currentRagSources.length > 0 ? [...currentRagSources] : undefined,
          documentType: documentType,
          informationNeeded: informationNeeded,
          informationSummary: informationSummary,
          readyToProceed: readyToProceed
        };

        const updatedConversations = conversationsWithUserMessage.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        );
        setConversations(updatedConversations);

        // Save conversations after adding AI response
        await saveConversations(updatedConversations);

        // Generate chat title asynchronously to avoid UI flicker
        setTimeout(async () => {
          const conversation = updatedConversations.find(c => c.id === conversationId);
          if (conversation) {
            const newTitle = await generateChatTitle(conversation.messages);
            if (newTitle && newTitle !== conversation.title) {
              setConversations(prevConversations => 
                prevConversations.map(conv =>
                  conv.id === conversationId ? { ...conv, title: newTitle } : conv
                )
              );
              // Save the updated title
              const conversationsWithNewTitle = updatedConversations.map(conv =>
                conv.id === conversationId ? { ...conv, title: newTitle } : conv
              );
              await saveConversations(conversationsWithNewTitle);
            }
          }
        }, 100); // Small delay to prevent UI interference

      } else {
        throw new Error('Electron not available');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}. Make sure Ollama is running and the model is available.`,
        timestamp: new Date()
      };

      const conversationsWithError = conversationsWithUserMessage.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      );
      setConversations(conversationsWithError);
      
      // Save conversations after adding error message
      await saveConversations(conversationsWithError);
    } finally {
      console.log('Setting isLoading to false, message processing complete');
      setIsLoading(false);
      setStreamingMessage(null);
      // Removed setIsThinking call
      // The useEffect will handle queue processing when isLoading becomes false
    }
  };

  const processNextInQueue = useCallback(async () => {
    if (messageQueue.length > 0 && !isProcessingQueue) {
      setIsProcessingQueue(true);
      const nextMessage = messageQueue[0];
      setMessageQueue(prev => prev.slice(1));
      
      console.log('Processing next queued message:', nextMessage.content.substring(0, 50) + '...');
      
      // Small delay to ensure UI updates properly
      setTimeout(async () => {
        try {
          await processMessage(nextMessage.content, nextMessage.attachments);
        } catch (error) {
          console.error('Error processing queued message:', error);
        } finally {
          setIsProcessingQueue(false);
          console.log('Finished processing queued message');
          // The useEffect will handle processing the next message when isProcessingQueue becomes false
        }
      }, 100);
    } else {
      console.log('Queue check:', { queueLength: messageQueue.length, isProcessingQueue });
    }
  }, [messageQueue, isProcessingQueue]);

  // Process queue when loading state changes and queue has items
  useEffect(() => {
    if (!isLoading && messageQueue.length > 0 && !isProcessingQueue) {
      console.log('Detected queue needs processing after isLoading became false', {
        isLoading,
        queueLength: messageQueue.length,
        isProcessingQueue,
        queueItems: messageQueue.map(m => m.content.substring(0, 30) + '...')
      });
      processNextInQueue();
    }
  }, [isLoading, messageQueue, isProcessingQueue, processNextInQueue]);

  const selectDirectoryForRAG = async () => {
    try {
      if (window.electron) {
        const directory = await window.electron.invoke('dialog:select-directory');
        if (directory) {
          // Add to directories array if not already present and limit to 3
          const newDirectories = [...settings.ragDirectories];
          if (!newDirectories.includes(directory)) {
            newDirectories.push(directory);
            if (newDirectories.length > 3) {
              newDirectories.shift(); // Remove oldest if over limit
            }
            saveSettings({ ...settings, ragDirectories: newDirectories });
            
            // Start indexing immediately
            if (settings.ragEnabled) {
              indexRAGDirectories();
            }
          }
        }
      } else {
        // Fallback for when electron is not available
        const directory = prompt('Enter RAG directory path:');
        if (directory) {
          const newDirectories = [...settings.ragDirectories];
          if (!newDirectories.includes(directory)) {
            newDirectories.push(directory);
            if (newDirectories.length > 3) {
              newDirectories.shift();
            }
            saveSettings({ ...settings, ragDirectories: newDirectories });
          }
        }
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      alert('Failed to open directory selector. Please enter the path manually.');
    }
  };


  const indexRAGDirectories = async () => {
    try {
      if (window.electron && settings.ragDirectories.length > 0) {
        setRagStatus(prev => ({ ...prev, isIndexing: true, indexingProgress: 0 }));
        
        console.log('Starting indexing for directories:', settings.ragDirectories);
        
        // Index all directories using the new IPC handler with directories
        const result = await window.electron.invoke('rag:index-all-directories', {
          directories: settings.ragDirectories
        });
        console.log('RAG indexing complete for all directories:', result);
        
        // Update status with final count
        setRagStatus(prev => ({
          ...prev,
          isIndexing: false,
          documentCount: result.documentCount || 0,
          lastIndexed: result.lastIndexed || Date.now()
        }));
      } else {
        alert('Please configure RAG directories first in settings.');
      }
    } catch (error) {
      console.error('Failed to index RAG directories:', error);
      setRagStatus(prev => ({ ...prev, isIndexing: false }));
      alert(`Failed to index documents: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the directories and try again.`);
    }
  };

  const forceReindexRAG = async () => {
    if (settings.ragDirectories.length === 0) {
      alert('Please select RAG directories first.');
      return;
    }
    
    if (confirm('This will completely clear the current index and re-index all documents fresh from the selected directories. All existing indexed content will be replaced. Continue?')) {
      await indexRAGDirectories();
    }
  };

  const clearRAGDatabase = async () => {
    if (confirm('This will permanently clear all indexed documents from the RAG database, all cached references, and reset RAG settings. You will need to reconfigure and re-index to use RAG again. Continue?')) {
      try {
        if (window.electron) {
          const result = await window.electron.invoke('rag:clear');
          console.log('RAG database cleared:', result);
          
          // Clear ALL RAG-related state completely
          setRagStatus({
            documentCount: 0,
            lastIndexed: 0,
            isIndexing: false,
            indexingProgress: 0
          });
          
          // Clear live RAG sources from current session
          setCurrentRagSources([]);
          
          // Clear matching documents state
          setMatchingDocuments({
            documents: [],
            searchTerms: [],
            totalMatches: 0
          });
          
          // Reset RAG directories and settings in the main settings state
          const clearedSettings = {
            ...settings,
            ragEnabled: false,
            ragDirectories: [],
            ragSensitivity: 70
          };
          
          // Update local settings state immediately
          setSettings(clearedSettings);
          
          // Save cleared settings
          if (window.electron) {
            await window.electron.invoke('settings:save', clearedSettings);
          }
          
          console.log('All RAG data and references cleared successfully');
          alert('RAG database and all references cleared successfully. RAG has been disabled and all cached data removed.');
        }
      } catch (error) {
        console.error('Failed to clear RAG database:', error);
        alert('Failed to clear RAG database. Please try again.');
      }
    }
  };





  const openFileInExplorer = async (filePath: string) => {
    try {
      if (window.electron) {
        await window.electron.invoke('fs:open-directory', filePath);
        console.log('Opened file in explorer:', filePath);
      } else {
        console.warn('Electron not available, cannot open file in explorer');
      }
    } catch (error) {
      console.error('Failed to open file in explorer:', error);
    }
  };



  // Show loading screen until settings are loaded
  if (!settingsLoaded) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0a14',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '24px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #5D2E46, #7B3F61)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Loading Icarus...
          </h2>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid transparent',
            borderTop: '3px solid #7B3F61',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div 
        key={`helios-${settingsLoaded ? 'loaded' : 'loading'}-${settings.contextLength}`}
        style={{ 
          display: 'flex', 
          height: '100vh', 
          background: '#0f0a14',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '280px' : '80px',
        background: 'rgba(30, 20, 30, 0.5)',
        borderRight: '1px solid #333029',
        padding: '24px',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/src/assets/icons/icon.jpeg" 
              alt="Icarus" 
              style={{ 
                width: '30px', 
                height: '30px',
                borderRadius: '5px'
              }} 
            />
            {sidebarOpen && (
              <h1 style={{ 
                fontSize: '25px', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #5D2E46, #7B3F61)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                Icarus
              </h1>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f8fafc',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px'
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen ? (
          <>
            {/* New Chat Button */}
            <button 
              onClick={createNewConversation}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #7B3F61, #5D2E46)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '16px'
              }}
            >
              + New Chat
            </button>

            {/* Chat History */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px 0' }}>Recent Chats</h3>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: activeConversationId === conv.id ? 'rgba(123, 63, 97, 0.3)' : 'transparent',
                    border: activeConversationId === conv.id ? '1px solid #7B3F61' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setCurrentView('chat');
                    }}
                    style={{
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {conv.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${conv.title}"?`)) {
                        deleteConversation(conv.id);
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '4px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 6px',
                      marginLeft: '8px',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    title={`Delete "${conv.title}"`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ borderTop: '1px solid #333029', paddingTop: '16px' }}>
              <button
                onClick={() => setCurrentView('chat')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: currentView === 'chat' ? 'rgba(123, 63, 97, 0.3)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginBottom: '4px',
                  textAlign: 'left'
                }}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: currentView === 'settings' ? 'rgba(123, 63, 97, 0.3)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left'
                }}
              >
                ⚙️ Settings
              </button>
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(51, 48, 41, 0.5)',
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              Made with love in 🇦🇺 by Matt Coles
            </div>
          </>
        ) : (
          <>
            {/* Collapsed Sidebar - Just Settings Icon */}
            <div style={{ flex: 1 }}></div>
            <button
              onClick={() => setCurrentView('settings')}
              style={{
                width: '48px',
                height: '48px',
                padding: '0',
                margin: '0 auto 16px',
                background: currentView === 'settings' ? 'rgba(123, 63, 97, 0.3)' : 'transparent',
                border: '1px solid transparent',
                borderRadius: '6px',
                color: '#f8fafc',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Settings"
            >
              ⚙️
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentView === 'chat' ? (
          <>
            {/* Chat Header */}
            <div style={{
              height: '56px',
              borderBottom: '1px solid #333029',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              background: 'rgba(15, 10, 20, 0.95)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: settings.selectedModel ? '#10b981' : '#ef4444'
                }}></div>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  {settings.selectedModel || 'No model selected'}
                </span>
                {modelSupportsThinking && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#3b82f6', 
                    background: 'rgba(59, 130, 246, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    🧠 Thinking
                  </span>
                )}
                {fileHandling.modelSupportsImages && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#a855f7', 
                    background: 'rgba(168, 85, 247, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    🖼️ Vision
                  </span>
                )}
                {settings.ragEnabled && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#7B3F61', 
                    background: 'rgba(123, 63, 97, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    RAG
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {activeConversation && activeConversation.messages.length > 0 ? (
                activeConversation.messages.map((message, index) => (
                  <MessageComponent
                    key={message.id}
                    message={{
                      ...message,
                      attachments: message.attachments?.map(att => ({
                        fileName: att.name,
                        fileType: att.type,
                        fileSize: att.size,
                        content: att.content,
                        base64: att.base64
                      }))
                    }}
                    settings={settings}
                    isLast={index === activeConversation.messages.length - 1}
                    onViewFile={fileHandling.viewFileContent}
                    onOpenInExplorer={openFileInExplorer}
                    onAddToChat={(fileName, content) => {
                      setInput(`[Added from ${fileName}]\n\n${content}`);
                    }}
                  />
                ))
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  textAlign: 'center'
                }}>
                  <div>
                    <h2 style={{ 
                      fontSize: '24px', 
                      marginBottom: '8px',
                      background: 'linear-gradient(135deg, #5D2E46, #7B3F61)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Welcome to Icarus
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
                      {settings.selectedModel ? 'Start a conversation below' : 'Select a model in Settings to begin'}
                    </p>
                  </div>
                </div>
              )}

              {/* Single Thinking/Response Display */}
              {(isLoading || streamingMessage) && (
                <div>
                  {/* Enhanced Matching Documents Display - Show RAG first */}
                  {matchingDocuments.documents.length > 0 && settings.ragEnabled && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7B3F61, #5D2E46)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          📚
                        </div>
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(123, 63, 97, 0.15), rgba(93, 46, 70, 0.1))',
                          border: '1px solid rgba(123, 63, 97, 0.4)',
                          borderRadius: '12px',
                          padding: '16px',
                          maxWidth: '85%',
                          boxShadow: '0 4px 12px rgba(123, 63, 97, 0.2)'
                        }}>
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#7B3F61', 
                            fontWeight: '600', 
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{
                              background: 'rgba(123, 63, 97, 0.2)',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {matchingDocuments.totalMatches} document{matchingDocuments.totalMatches !== 1 ? 's' : ''} found
                            </div>
                            {matchingDocuments.searchTerms.length > 0 && (
                              <div style={{ fontSize: '11px', opacity: 0.8, fontStyle: 'italic' }}>
                                Keywords: {matchingDocuments.searchTerms.map(term => `"${term}"`).join(', ')}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px'
                          }}>
                            {matchingDocuments.documents.map((doc, idx) => (
                              <button
                                key={idx}
                                onClick={() => fileHandling.viewFileContent(doc.filePath)}
                                style={{
                                  fontSize: '11px',
                                  padding: '6px 10px',
                                  background: 'rgba(123, 63, 97, 0.15)',
                                  border: '1px solid rgba(123, 63, 97, 0.4)',
                                  borderRadius: '6px',
                                  color: '#7B3F61',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  textDecoration: 'none',
                                  maxWidth: '200px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(123, 63, 97, 0.25)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 63, 97, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(123, 63, 97, 0.15)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                                title={`Click to open directory containing ${doc.fileName}\n\nPreview: ${doc.excerpt}`}
                              >
                                <div style={{ fontSize: '14px' }}>
                                  {doc.fileName.endsWith('.md') ? '📝' :
                                   doc.fileName.endsWith('.txt') ? '📄' :
                                   doc.fileName.endsWith('.json') ? '⚙️' :
                                   doc.fileName.endsWith('.csv') ? '📊' : '📄'}
                                </div>
                                <div style={{ 
                                  fontWeight: '600',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }}>
                                  {doc.fileName}
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  color: '#94a3b8',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontWeight: '500'
                                }}>
                                  ✓
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Single Thinking Bubble - Shows thinking content when available, loading dots otherwise */}
                  {settings.showThinking && (isLoading || streamingMessage?.thinking) && (
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(123, 63, 97, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        flexShrink: 0
                      }}>
                        💭
                      </div>
                      <div style={{
                        background: 'rgba(123, 63, 97, 0.1)',
                        border: '1px solid rgba(123, 63, 97, 0.3)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        fontSize: '13px',
                        maxWidth: '85%'
                      }}>
                        <div style={{ fontSize: '11px', color: '#7B3F61', marginBottom: '4px', fontWeight: '500' }}>
                          🧠 Thinking...
                        </div>
                        {streamingMessage?.thinking ? (
                          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                            {streamingMessage.thinking}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#7B3F61',
                              animation: 'pulse 1.5s ease-in-out infinite'
                            }}></div>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#7B3F61',
                              animation: 'pulse 1.5s ease-in-out infinite 0.5s'
                            }}></div>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#7B3F61',
                              animation: 'pulse 1.5s ease-in-out infinite 1s'
                            }}></div>
                            <span style={{ marginLeft: '8px', opacity: 0.8 }}>Processing...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Streaming Response - Shows immediately when content is available */}
                  {(() => {
                    const shouldShowResponse = streamingMessage?.content;
                    
                    return shouldShowResponse ? (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(123, 63, 97, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}>
                          🤖
                        </div>
                        <div style={{
                          background: 'rgba(30, 20, 30, 0.8)',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          color: 'white',
                          maxWidth: '85%'
                        }}>
                          <ReactMarkdown
                            components={{
                              code: ({children, ...props}: any) => {
                                const inline = (props as any).inline;
                                if (inline) {
                                  return <code style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    fontSize: '0.9em'
                                  }} {...props}>{children}</code>
                                }
                                return <pre style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  padding: '12px',
                                  borderRadius: '6px',
                                  overflowX: 'auto',
                                  fontSize: '0.9em'
                                }}><code {...props}>{children}</code></pre>
                              },
                              p: ({children}) => <p style={{margin: '0 0 8px 0'}}>{children}</p>,
                              ul: ({children}) => <ul style={{margin: '0 0 8px 0', paddingLeft: '20px'}}>{children}</ul>,
                              ol: ({children}) => <ol style={{margin: '0 0 8px 0', paddingLeft: '20px'}}>{children}</ol>,
                              h1: ({children}) => <h1 style={{margin: '0 0 12px 0', fontSize: '1.4em'}}>{children}</h1>,
                              h2: ({children}) => <h2 style={{margin: '0 0 10px 0', fontSize: '1.3em'}}>{children}</h2>,
                              h3: ({children}) => <h3 style={{margin: '0 0 8px 0', fontSize: '1.2em'}}>{children}</h3>,
                              blockquote: ({children}) => <blockquote style={{
                                borderLeft: '3px solid #7B3F61',
                                paddingLeft: '12px',
                                margin: '0 0 8px 0',
                                fontStyle: 'italic',
                                opacity: 0.9
                              }}>{children}</blockquote>
                            }}
                          >
                            {streamingMessage.content}
                          </ReactMarkdown>
                          {isLoading && <span style={{ opacity: 0.6 }}>▊</span>}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div 
              style={{ 
                borderTop: '1px solid #333029', 
                padding: '16px',
                background: fileHandling.isDragging ? 'rgba(123, 63, 97, 0.1)' : 'transparent',
                transition: 'background 0.2s ease'
              }}
              onDrop={fileHandling.handleFileDrop}
              onDragOver={fileHandling.handleDragOver}
              onDragLeave={fileHandling.handleDragLeave}
            >
              {/* Thinking and RAG Toggles */}
              {settings.selectedModel && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '12px',
                  marginBottom: '12px',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: 'pointer', 
                    fontSize: '13px', 
                    color: '#94a3b8',
                    padding: '4px 8px',
                    background: 'rgba(123, 63, 97, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(123, 63, 97, 0.3)'
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.showThinking}
                      onChange={(e) => saveSettings({ ...settings, showThinking: e.target.checked })}
                      style={{ accentColor: '#7B3F61' }}
                    />
                    💭 Show thinking {modelSupportsThinking ? '(supported)' : '(experimental)'}
                  </label>
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: 'pointer', 
                    fontSize: '13px', 
                    color: '#94a3b8',
                    padding: '4px 8px',
                    background: 'rgba(123, 63, 97, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(123, 63, 97, 0.3)',
                    opacity: settings.ragDirectories.length > 0 ? 1 : 0.6
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.ragEnabled}
                      onChange={(e) => saveSettings({ ...settings, ragEnabled: e.target.checked })}
                      disabled={settings.ragDirectories.length === 0}
                      style={{ accentColor: '#7B3F61' }}
                    />
                    📚 Use RAG {settings.ragDirectories.length > 0 
                      ? `(${ragStatus.documentCount} docs${ragStatus.isIndexing ? ', syncing...' : ''})` 
                      : '(setup in settings)'}
                  </label>
                </div>
              )}
              
              {/* Attached Files Display */}
              {fileHandling.attachedFiles.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                    📎 Attached Files:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {fileHandling.attachedFiles.map((file: any, index: number) => (
                      <div key={index} style={{
                        background: 'rgba(123, 63, 97, 0.2)',
                        border: '1px solid rgba(123, 63, 97, 0.4)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>
                          {file.type.startsWith('image/') ? '🖼️' : 
                           file.name.toLowerCase().endsWith('.pdf') ? '📕' :
                           file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? '📄' :
                           file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? '📊' :
                           file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.ppt') ? '📊' :
                           file.name.toLowerCase().endsWith('.csv') ? '📋' :
                           file.name.toLowerCase().endsWith('.json') ? '⚙️' :
                           file.name.toLowerCase().endsWith('.md') ? '📝' :
                           file.name.toLowerCase().endsWith('.eml') || file.name.toLowerCase().endsWith('.msg') ? '📧' :
                           '📄'} {file.name} ({(file.size / 1024).toFixed(1)}KB)
                        </span>
                        <button
                          onClick={() => fileHandling.removeAttachment(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* File/Image Support Hint */}
              {settings.selectedModel && !fileHandling.isDragging && fileHandling.attachedFiles.length === 0 && (
                <div style={{
                  fontSize: '12px',
                  color: '#64748b',
                  textAlign: 'center',
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'rgba(123, 63, 97, 0.05)',
                  borderRadius: '6px',
                  border: '1px dashed rgba(123, 63, 97, 0.2)'
                }}>
                  {fileHandling.modelSupportsImages ? (
                    <>🖼️ Drag images or 📄 documents here for examination</>
                  ) : (
                    <>📄 Drag documents here for examination</>
                  )}
                  <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                    Supports: {fileHandling.modelSupportsImages ? 'Images (PNG, JPG), ' : ''}Text, Markdown, JSON, CSV, PDF, Word, Excel, PowerPoint, Email
                  </div>
                </div>
              )}

              {/* Drag Drop Hint */}
              {fileHandling.isDragging && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(123, 63, 97, 0.1)',
                  border: '2px dashed #7B3F61',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: '#7B3F61',
                  zIndex: 10
                }}>
                  {fileHandling.modelSupportsImages ? (
                    <>🖼️ Drop images or 📁 files here</>
                  ) : (
                    <>📁 Drop files here to attach them</>
                  )}
                </div>
              )}

              {/* Message Queue Display */}
              {messageQueue.length > 0 && (
                <div style={{ 
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'rgba(123, 63, 97, 0.1)',
                  border: '1px solid rgba(123, 63, 97, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#7B3F61', 
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    📝 Queued Messages ({messageQueue.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {messageQueue.slice(0, 3).map((msg, index) => (
                      <div key={msg.id} style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        padding: '4px 8px',
                        background: 'rgba(30, 20, 30, 0.3)',
                        borderRadius: '4px',
                        border: '1px solid rgba(123, 63, 97, 0.2)'
                      }}>
                        {index + 1}. {msg.content.substring(0, 50)}{msg.content.length > 50 ? '...' : ''}
                        {msg.attachments.length > 0 && (
                          <span style={{ marginLeft: '4px', color: '#7B3F61' }}>
                            📎{msg.attachments.length}
                          </span>
                        )}
                      </div>
                    ))}
                    {messageQueue.length > 3 && (
                      <div style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}>
                        ...and {messageQueue.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={settings.selectedModel ? (isLoading ? "Type another message (will be queued)..." : "Type a message...") : "Select a model in Settings first..."}
                  disabled={!settings.selectedModel}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(30, 20, 30, 0.8)',
                    border: '1px solid #333029',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    opacity: settings.selectedModel ? 1 : 0.5
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !settings.selectedModel}
                  style={{
                    padding: '12px 16px',
                    background: (input.trim() && settings.selectedModel)
                      ? 'linear-gradient(135deg, #7B3F61, #5D2E46)' 
                      : 'rgba(123, 63, 97, 0.3)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: (input.trim() && settings.selectedModel) ? 'pointer' : 'not-allowed',
                    fontSize: '14px'
                  }}
                >
                  {isLoading ? (messageQueue.length > 0 ? `⏳ (+${messageQueue.length})` : '⏳') : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Settings View */
          <SettingsPanel
            settings={settings}
            availableModels={availableModels}
            ragStatus={{
              ...ragStatus,
              indexingProgress: ragStatus.indexingProgress || 0,
              isIndexed: ragStatus.documentCount > 0,
              lastIndexed: ragStatus.lastIndexed > 0 ? new Date(ragStatus.lastIndexed).toLocaleString() : 'Never'
            }}
            installProgress={installProgress}
            onSettingsChange={saveSettings}
            onLoadModels={loadOllamaModels}
            onSelectDirectory={selectDirectoryForRAG}
            onRemoveDirectory={(index) => {
              const newDirectories = settings.ragDirectories.filter((_, i) => i !== index);
              saveSettings({ ...settings, ragDirectories: newDirectories });
            }}
            onIndexRAG={forceReindexRAG}
            onClearRAG={clearRAGDatabase}
            onClearChats={clearAllConversations}
            onInstallModel={async (modelName: string) => {
              console.log('Install model requested:', modelName);
              
              if (!modelName.trim()) {
                alert('Please enter a model name');
                return;
              }
              
              try {
                // Set installation state
                setInstallProgress({
                  installing: true,
                  message: `Starting installation of ${modelName}...`
                });
                
                if (window.electron) {
                  // Use the existing pull handler
                  await window.electron.invoke('ollama:pull', { model: modelName.trim() });
                  
                  // Success feedback
                  setInstallProgress({
                    installing: false,
                    message: `${modelName} installed successfully!`
                  });
                  
                  // Clear success message after 3 seconds
                  setTimeout(() => {
                    setInstallProgress({
                      installing: false,
                      message: ''
                    });
                  }, 3000);
                  
                  // Refresh model list
                  await loadOllamaModels();
                  
                  console.log(`Model ${modelName} installed successfully`);
                } else {
                  throw new Error('Electron context not available');
                }
              } catch (error) {
                console.error('Model installation failed:', error);
                
                // Error feedback
                setInstallProgress({
                  installing: false,
                  message: `Failed to install ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                
                // Clear error message after 5 seconds
                setTimeout(() => {
                  setInstallProgress({
                    installing: false,
                    message: ''
                  });
                }, 5000);
                
                alert(`Failed to install model ${modelName}. Please check the model name and try again.`);
              }
            }}
          />
        )}
      </div>
      
      {/* File Viewer Modal */}
      {fileHandling.viewingFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '90%',
            height: '90%',
            maxWidth: '1200px',
            background: '#1a0d1a',
            borderRadius: '12px',
            border: '1px solid #333029',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* File Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #333029',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(123, 63, 97, 0.1)'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  color: '#f8fafc',
                  fontWeight: '600'
                }}>
                  📄 {fileHandling.viewingFile.name}
                </h2>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#94a3b8', 
                  marginTop: '4px' 
                }}>
                  File: {fileHandling.viewingFile.path}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => fileHandling.addFileToChat(fileHandling.viewingFile!.name, fileHandling.viewingFile!.content, setInput)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #7B3F61, #5D2E46)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  📋 Add to Chat
                </button>
                <button
                  onClick={() => fileHandling.setViewingFile(null)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.3)',
                    border: '1px solid #dc2626',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            {/* File Content */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              background: '#0f0a14'
            }}>
              <pre style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#f8fafc',
                fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {fileHandling.viewingFile.content}
              </pre>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default App;