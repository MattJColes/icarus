import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger, loggers } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Enhanced RAG storage with persistence and incremental tracking
interface DocumentChunk {
  content: string;
  file: string; // Full file path
  lastModified: number; // File modification time
  indexed: number; // When this chunk was indexed
  size: number; // File size for change detection
}

const ragDatabase: DocumentChunk[] = [];
const ragSettings = {
  directories: [] as string[],
  sensitivity: 70,
  lastIndexed: 0,
  isIndexing: false
};

// Auto-indexing timer
let autoIndexTimer: NodeJS.Timeout | null = null;

// Settings storage
const settingsPath = path.join(app.getPath('userData'), 'icarus-settings.json');

// Conversations storage
const conversationsPath = path.join(app.getPath('userData'), 'icarus-conversations.json');

// RAG database storage
const ragDatabasePath = path.join(app.getPath('userData'), 'icarus-rag-database.json');

const createWindow = async () => {
  loggers.startup('Creating main window');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    backgroundColor: '#1a0d1a',
    show: false,
    resizable: true,
  });

  mainWindow.once('ready-to-show', () => {
    loggers.startup('Main window ready to show');
    mainWindow?.show();
  });

  // VITE_DEV_SERVER_URL is set by Electron Forge Vite plugin in development
  if (process.env.VITE_DEV_SERVER_URL) {
    loggers.startup('Loading development URL');
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Try development server first, fallback to production
    try {
      loggers.startup('Attempting to load development URL');
      await mainWindow.loadURL('http://localhost:5173/');
      mainWindow.webContents.openDevTools();
    } catch (error) {
      loggers.startup('Development server not available, loading production HTML file');
      mainWindow.loadFile(join(__dirname, '../renderer/main_window/index.html'));
    }
  }

  mainWindow.on('closed', () => {
    loggers.startup('Main window closed');
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(async () => {
  loggers.startup('Electron app ready, initializing...');
  await createWindow();

  setupIPCHandlers();
  
  // Load RAG database immediately on startup
  try {
    await loadRAGDatabase();
    loggers.startup('RAG database loaded on startup');
  } catch (error) {
    loggers.error('Failed to load RAG database on startup', error);
  }
  
  startAutoIndexing();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      loggers.startup('Reactivating app - creating new window');
      await createWindow();
    }
  });
}).catch(error => {
  loggers.error('Failed to start app', error);
});

app.on('window-all-closed', () => {
  loggers.shutdown('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// RAG database persistence functions
const loadRAGDatabase = async (): Promise<void> => {
  try {
    loggers.rag('Loading RAG database from disk');
    const data = await fs.readFile(ragDatabasePath, 'utf-8');
    const savedDatabase = JSON.parse(data);
    
    if (Array.isArray(savedDatabase)) {
      ragDatabase.length = 0; // Clear existing
      ragDatabase.push(...savedDatabase);
      loggers.rag('RAG database loaded successfully', { 
        documentCount: ragDatabase.length,
        totalSize: ragDatabase.length
      });
    } else {
      loggers.rag('Invalid RAG database format, starting fresh');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      loggers.rag('No existing RAG database found, starting fresh');
    } else {
      loggers.error('Failed to load RAG database', error);
    }
  }
};

const saveRAGDatabase = async (): Promise<void> => {
  try {
    loggers.rag('Saving RAG database to disk', { documentCount: ragDatabase.length });
    
    // Create a clean copy with only essential data
    const databaseToSave = ragDatabase.map(chunk => ({
      content: chunk.content,
      file: chunk.file,
      lastModified: chunk.lastModified,
      indexed: chunk.indexed,
      size: chunk.size
    }));
    
    await fs.writeFile(ragDatabasePath, JSON.stringify(databaseToSave, null, 2), 'utf-8');
    loggers.rag('RAG database saved successfully');
  } catch (error) {
    loggers.error('Failed to save RAG database', error);
    throw error;
  }
};

function setupIPCHandlers() {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('platform:info', () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion(),
  }));
  
  ipcMain.handle('app:logs-directory', () => {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    loggers.user('Requested logs directory', { logsDir });
    return logsDir;
  });

  // Settings handlers
  ipcMain.handle('settings:load', async () => {
    loggers.ipc('Loading settings');
    
    // Default settings - ensure all properties are defined
    const defaultSettings = {
      showThinking: false,
      ragEnabled: false,
      ragDirectories: [],
      ragSensitivity: 70,  // Default 70% minimum score
      selectedModel: '',
      systemPrompt: 'You are Icarus, a expert chatbot versed in Amazon Web Services writing practices. Ask the user for clarifying questions.',
      // Model parameters with sensible defaults
      temperature: 0.7,
      contextLength: 40000,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1
    };
    
    try {
      const data = await fs.readFile(settingsPath, 'utf-8');
      const savedSettings = JSON.parse(data);
      
      // Merge saved settings with defaults to ensure all properties exist
      const mergedSettings = {
        ...defaultSettings,
        ...savedSettings
      };
      
      // Migrate legacy ragDirectory to ragDirectories array
      if (savedSettings.ragDirectory && !savedSettings.ragDirectories) {
        mergedSettings.ragDirectories = [savedSettings.ragDirectory];
        delete mergedSettings.ragDirectory;
        loggers.settings('Migrated legacy RAG directory setting');
      }
      
      loggers.settings('Settings loaded successfully', { 
        ragEnabled: mergedSettings.ragEnabled,
        ragDirectories: mergedSettings.ragDirectories?.length || 0,
        selectedModel: mergedSettings.selectedModel
      });
      
      // Update RAG settings if they exist
      if (mergedSettings.ragDirectories && mergedSettings.ragDirectories.length > 0) {
        ragSettings.directories = mergedSettings.ragDirectories;
        ragSettings.sensitivity = mergedSettings.ragSensitivity || 70;
        loggers.rag('RAG settings updated', {
          directories: mergedSettings.ragDirectories,
          sensitivity: mergedSettings.ragSensitivity
        });
      }
      
      return mergedSettings;
    } catch (error) {
      loggers.settings('Settings file not found, using defaults', { error: error.message });
      return defaultSettings;
    }
  });

  ipcMain.handle('settings:save', async (event, settings) => {
    try {
      console.log('Saving settings to file:', settings);
      
      // Ensure the userData directory exists
      const userDataPath = path.dirname(settingsPath);
      await fs.mkdir(userDataPath, { recursive: true });
      
      // Write settings to file with pretty formatting
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
      console.log('Settings saved successfully to:', settingsPath);
      
      // Update RAG settings
      const oldDirectories = ragSettings.directories;
      const oldSensitivity = ragSettings.sensitivity;
      
      ragSettings.directories = settings.ragDirectories || [];
      ragSettings.sensitivity = settings.ragSensitivity || 70;
      
      // Check if directories or sensitivity changed
      const directoriesChanged = JSON.stringify(oldDirectories) !== JSON.stringify(ragSettings.directories);
      const sensitivityChanged = oldSensitivity !== ragSettings.sensitivity;
      
      if (directoriesChanged) {
        console.log('RAG directories changed from', oldDirectories, 'to', ragSettings.directories);
        
        // Auto-index if RAG is enabled and directories changed
        if (settings.ragEnabled && ragSettings.directories.length > 0) {
          console.log('Auto-indexing new RAG directories...');
          setTimeout(() => indexAllDirectories(), 1000);
        }
      }
      
      if (sensitivityChanged) {
        console.log('RAG sensitivity changed from', oldSensitivity, 'to', ragSettings.sensitivity);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  });

  // RAG database handlers
  ipcMain.handle('rag:load-database', loadRAGDatabase);
  ipcMain.handle('rag:save-database', saveRAGDatabase);

  // Conversation handlers
  ipcMain.handle('conversations:load', async () => {
    const defaultConversations: any[] = [];
    
    try {
      const data = await fs.readFile(conversationsPath, 'utf-8');
      const savedConversations = JSON.parse(data);
      
      // Ensure we have an array
      if (!Array.isArray(savedConversations)) {
        console.log('Invalid conversations format, using defaults');
        return defaultConversations;
      }
      
      console.log(`Loaded ${savedConversations.length} conversations from disk`);
      return savedConversations;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('Conversations file not found, using defaults');
      } else {
        console.error('Error loading conversations:', error);
      }
      return defaultConversations;
    }
  });

  ipcMain.handle('conversations:save', async (event, conversations) => {
    try {
      // Ensure directory exists
      const userDataPath = path.dirname(conversationsPath);
      await fs.mkdir(userDataPath, { recursive: true });
      
      // Validate input
      if (!Array.isArray(conversations)) {
        throw new Error('Conversations must be an array');
      }
      
      // Save conversations with pretty formatting
      await fs.writeFile(conversationsPath, JSON.stringify(conversations, null, 2));
      console.log(`Saved ${conversations.length} conversations to disk`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save conversations:', error);
      throw error;
    }
  });

  // Ollama handlers
  ipcMain.handle('ollama:list', async () => {
    loggers.ipc('Fetching Ollama models');
    
    try {
      const startTime = Date.now();
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Ollama not running');
      }
      const data = await response.json();
      const models = data.models || [];
      
      loggers.performance('Ollama model list fetch', Date.now() - startTime);
      loggers.ollama('Fetched models successfully', { count: models.length });
      
      // Auto-install qwen3:4b if no models are present or if qwen3:4b specifically is missing
      const hasQwen3 = models.some(m => m.name.includes('qwen3:4b'));
      
      if (models.length === 0 || !hasQwen3) {
        loggers.ollama('Installing default model qwen3:4b');
        try {
          await installDefaultModel();
          // Re-fetch models after installation
          const updatedResponse = await fetch('http://localhost:11434/api/tags');
          if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json();
            loggers.ollama('Default model installed, models updated', { count: updatedData.models?.length || 0 });
            return updatedData.models || [];
          }
        } catch (installError) {
          loggers.error('Failed to install default model', installError);
        }
      }
      
      return models;
    } catch (error) {
      loggers.error('Failed to fetch Ollama models', error);
      return [];
    }
  });

  // Model installation handler (with both names for compatibility)
  ipcMain.handle('ollama:pull', async (event, data) => {
    const modelName = typeof data === 'string' ? data : data.model;
    return await installModelWithProgress(modelName);
  });

  ipcMain.handle('ollama:install-model', async (event, modelName) => {
    return await installModelWithProgress(modelName);
  });

  // Extract model installation logic
  async function installModelWithProgress(modelName: string) {
    try {
      console.log('Installing model:', modelName);
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start model installation');
      }
      
      // Stream the installation progress
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (mainWindow) {
                mainWindow.webContents.send('ollama:pull:progress', parsed);
              }
              if (parsed.status === 'success') {
                return { success: true };
              }
            } catch (parseError) {
              console.log('Failed to parse installation progress:', line);
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Model installation error:', error);
      throw error;
    }
  }

  ipcMain.handle('ollama:recommend', async () => {
    return 'qwen2.5:8b';
  });

  ipcMain.handle('ollama:chat', async (event, data) => {
    const startTime = Date.now();
    loggers.chat('Starting chat request', { 
      model: data.model, 
      messageCount: data.messages?.length || 0,
      ragEnabled: data.ragEnabled
    });
    
    try {
      let enhancedMessages = [...data.messages];
      
      // Add RAG context if enabled
      if (data.ragEnabled && ragDatabase.length > 0) {
        const lastUserMessage = data.messages[data.messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
          loggers.rag('Searching RAG database', { 
            query: lastUserMessage.content.substring(0, 100) + '...',
            databaseSize: ragDatabase.length
          });
          
          // Search for relevant documents using improved scoring
          const searchTerms = lastUserMessage.content.toLowerCase().split(/\s+/).filter(term => term.length > 2);
          console.log('Search terms:', searchTerms);
          
          // Score documents based on relevance
          const scoredDocs = ragDatabase
            .map(doc => {
              const docContent = doc.content.toLowerCase();
              let score = 0;
              let matchedTerms = 0;
              
              // Count matching terms and give higher scores for exact matches
              searchTerms.forEach(term => {
                if (docContent.includes(term)) {
                  matchedTerms++;
                  // Higher score for exact word matches vs substring matches
                  if (docContent.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`))) {
                    score += 3;
                  } else {
                    score += 1;
                  }
                }
              });
              
              // Bonus for multiple term matches
              if (matchedTerms > 1) {
                score += matchedTerms * 2;
              }
              
              return { doc, score, matchedTerms };
            })
            .filter(item => {
              // Convert sensitivity percentage to minimum score
              // Max possible score is roughly searchTerms.length * 5 (3 for exact + 2 bonus)
              const maxPossibleScore = searchTerms.length * 5;
              const minScore = (ragSettings.sensitivity / 100) * maxPossibleScore;
              return item.score >= Math.max(1, minScore); // At least 1 point required
            })
            .sort((a, b) => b.score - a.score) // Sort by score descending
            .slice(0, 3); // Take top 3
          
          const matchingDocs = scoredDocs.map(item => item.doc);
          
          console.log(`Found ${matchingDocs.length} relevant documents with scores:`, 
            scoredDocs.map(item => ({ file: item.doc.file, score: item.score, terms: item.matchedTerms })));
          
          const ragResults = matchingDocs
            .map(doc => `[From ${doc.file}]: ${doc.content}`)
            .join('\n\n');
          
          if (ragResults) {
            console.log('Found RAG context:', ragResults.length, 'characters');
            
            // Store RAG sources for citations (using same matching docs)
            const ragSources = matchingDocs
              .map(doc => ({
                file: doc.file,
                content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
                lastModified: doc.lastModified
              }));
            
            // Add RAG context as system message
            const ragSystemMessage = {
              role: 'system',
              content: `Here is relevant information from the user's documents to help answer their question:\n\n${ragResults}\n\nPlease use this information to provide a more accurate and informed response.`
            };
            
            // Insert RAG context before the last user message
            enhancedMessages.splice(-1, 0, ragSystemMessage);
            
            // Send RAG sources to renderer for citations and live display
            if (mainWindow) {
              mainWindow.webContents.send('rag:sources-found', {
                sources: ragSources,
                query: lastUserMessage.content
              });
              
              // Also send matching documents for live display
              mainWindow.webContents.send('rag:matching-documents', {
                documents: ragSources,
                searchTerms: searchTerms,
                totalMatches: matchingDocs.length
              });
            }
          } else {
            console.log('No RAG context found for query:', lastUserMessage.content);
          }
        }
      }

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          messages: enhancedMessages,
          stream: true,
          think: data.think || false,
          options: data.options || {}
        }),
      });
      
      if (!response.ok) {
        throw new Error('Chat request failed');
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullMessage = { content: '', thinking: '' };
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              // console.log('Streaming chunk:', parsed);
              
              // Send streaming updates to renderer
              if (mainWindow) {
                mainWindow.webContents.send('ollama:chat:stream', parsed);
              }
              
              // Accumulate final message
              if (parsed.message) {
                if (parsed.message.content) {
                  fullMessage.content += parsed.message.content;
                }
                if (parsed.message.thinking) {
                  fullMessage.thinking += parsed.message.thinking;
                }
              }
              
              if (parsed.done) {
                console.log('Stream complete, final message:', fullMessage);
                return [{ message: fullMessage }];
              }
            } catch (parseError) {
              console.log('Failed to parse line:', line, parseError);
            }
          }
        }
      }
      
      return [{ message: fullMessage }];
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  });

  // Check if a model supports thinking
  ipcMain.handle('ollama:model-info', async (event, modelName) => {
    try {
      const response = await fetch('http://localhost:11434/api/show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get model info');
      }
      
      const info = await response.json();
      
      // Check if model supports thinking based on Ollama documentation
      const supportsThinking = modelName.toLowerCase().includes('deepseek') ||
                              modelName.toLowerCase().includes('r1') ||
                              modelName.toLowerCase().includes('qwen3') ||
                              modelName.toLowerCase().includes('o1') ||
                              modelName.toLowerCase().includes('intuitive-thinker') ||
                              modelName.toLowerCase().includes('chain-of-thought') ||
                              (info.details?.family && 
                               ['deepseek', 'qwen3', 'o1'].some(family => 
                                 info.details.family.toLowerCase().includes(family)));
      
      // Check if model supports vision based on known vision model patterns
      const supportsVision = modelName.toLowerCase().includes('llava') ||
                             modelName.toLowerCase().includes('minicpm') ||
                             modelName.toLowerCase().includes('moondream') ||
                             modelName.toLowerCase().includes('bakllava') ||
                             modelName.toLowerCase().includes('vision') ||
                             modelName.toLowerCase().includes('visual') ||
                             modelName.toLowerCase().includes('qwen2-vl') ||
                             modelName.toLowerCase().includes('qwen2.5-vision') ||
                             modelName.toLowerCase().includes('qwen-vl') ||
                             modelName.toLowerCase().includes('gemma2-vision') ||
                             modelName.toLowerCase().includes('gemma-vision') ||
                             modelName.toLowerCase().includes('pixtral') ||
                             modelName.toLowerCase().includes('internvl') ||
                             modelName.toLowerCase().includes('cogvlm') ||
                             (info.details?.family && 
                              ['llava', 'minicpm', 'moondream', 'vision', 'qwen-vl', 'qwen2-vl', 'gemma2', 'pixtral', 'internvl', 'cogvlm'].some(family => 
                                info.details.family.toLowerCase().includes(family)));
      
      // Extract context length from model parameters
      let contextLength = 40000; // Default fallback
      if (info.parameters) {
        // Check various parameter names that might contain context length
        const paramStr = info.parameters.toLowerCase();
        const ctxMatch = paramStr.match(/num_ctx[^\d]*(\d+)/);
        const contextMatch = paramStr.match(/context[^\d]*(\d+)/);
        const lengthMatch = paramStr.match(/context_length[^\d]*(\d+)/);
        
        if (ctxMatch) contextLength = parseInt(ctxMatch[1]);
        else if (contextMatch) contextLength = parseInt(contextMatch[1]);
        else if (lengthMatch) contextLength = parseInt(lengthMatch[1]);
        
        // Reasonable bounds checking
        if (contextLength < 512) contextLength = 512;
        if (contextLength > 32768) contextLength = 32768;
      }
      
      return {
        ...info,
        supportsThinking,
        supportsVision,
        contextLength
      };
    } catch (error) {
      console.error('Model info error:', error);
      return { supportsThinking: false, supportsVision: false };
    }
  });

  // Directory selection for RAG
  ipcMain.handle('dialog:select-directory', async () => {
    if (!mainWindow) {
      throw new Error('No main window available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select RAG Documents Directory',
      buttonLabel: 'Select Folder'
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // RAG indexing and search
  ipcMain.handle('rag:index-all-directories', async () => {
    const startTime = Date.now();
    loggers.rag('Starting RAG indexing for all directories', { 
      directories: ragSettings.directories,
      directoryCount: ragSettings.directories.length
    });
    
    try {
      if (ragSettings.directories.length === 0) {
        throw new Error('No directories configured');
      }

      ragSettings.isIndexing = true;
      
      // Send indexing status update
      if (mainWindow) {
        mainWindow.webContents.send('rag:indexing-status', { 
          isIndexing: true, 
          message: 'Starting to index all directories...' 
        });
      }

      await indexAllDirectories();
      
      loggers.performance('RAG indexing completed', Date.now() - startTime);
      loggers.rag('RAG indexing completed successfully', {
        documentCount: ragDatabase.length,
        directories: ragSettings.directories.length
      });
      
      return {
        success: true,
        documentCount: ragDatabase.length,
        lastIndexed: ragSettings.lastIndexed
      };
    } catch (error) {
      ragSettings.isIndexing = false;
      loggers.error('RAG indexing failed', error, { 
        directories: ragSettings.directories,
        duration: Date.now() - startTime
      });
      throw error;
    }
  });

  ipcMain.handle('rag:index-directory', async (event, directory) => {
    try {
      if (!directory) {
        throw new Error('No directory provided');
      }

      // Update directories to include this directory if not already present
      if (!ragSettings.directories.includes(directory)) {
        ragSettings.directories.push(directory);
      }
      ragSettings.isIndexing = true;
      
      // Send indexing status update
      if (mainWindow) {
        mainWindow.webContents.send('rag:indexing-status', { 
          isIndexing: true, 
          message: 'Starting to index documents...' 
        });
      }

      // For single directory indexing, we'll calculate progress too
      const files = await getFilesRecursively(directory);
      const supportedExtensions = ['.md', '.txt', '.json', '.csv', '.mmd', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.eml', '.msg'];
      const supportedFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });
      
      await indexDocuments(directory, true, supportedFiles.length, 0);
      
      ragSettings.isIndexing = false;
      ragSettings.lastIndexed = Date.now();

      if (mainWindow) {
        mainWindow.webContents.send('rag:indexing-status', { 
          isIndexing: false, 
          message: `Indexed ${ragDatabase.length} documents`,
          documentCount: ragDatabase.length,
          indexingProgress: 100
        });
      }

      return {
        success: true,
        documentCount: ragDatabase.length,
        lastIndexed: ragSettings.lastIndexed
      };
    } catch (error) {
      ragSettings.isIndexing = false;
      console.error('RAG indexing error:', error);
      throw error;
    }
  });

  ipcMain.handle('rag:search', async (event, query) => {
    if (!query || ragDatabase.length === 0) {
      return [];
    }

    // Simple text search (in production, you'd use vector similarity)
    const results = ragDatabase
      .filter(doc => 
        doc.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5) // Limit to top 5 results
      .map(doc => ({
        content: doc.content.substring(0, 500) + '...',
        file: doc.file,
        snippet: extractSnippet(doc.content, query)
      }));

    return results;
  });

  ipcMain.handle('rag:status', async () => {
    return {
      isIndexing: ragSettings.isIndexing,
      documentCount: ragDatabase.length,
      lastIndexed: ragSettings.lastIndexed,
      directories: ragSettings.directories,
      sensitivity: ragSettings.sensitivity
    };
  });

  ipcMain.handle('rag:clear', async () => {
    try {
      ragDatabase.length = 0; // Clear the database
      ragSettings.lastIndexed = 0;
      
      if (mainWindow) {
        mainWindow.webContents.send('rag:indexing-status', { 
          isIndexing: false, 
          message: 'RAG database cleared',
          documentCount: 0,
          lastIndexed: 0
        });
      }

      return {
        success: true,
        message: 'RAG database cleared successfully'
      };
    } catch (error) {
      console.error('Failed to clear RAG database:', error);
      throw error;
    }
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // File system operations
  ipcMain.handle('fs:open-directory', async (event, filePath) => {
    try {
      const directoryPath = path.dirname(filePath);
      loggers.file('Opening directory in explorer', { filePath, directoryPath });
      await shell.openPath(directoryPath);
      loggers.user('Opened file in explorer', { fileName: path.basename(filePath) });
      return { success: true };
    } catch (error) {
      loggers.error('Failed to open directory', error, { filePath });
      throw error;
    }
  });

  ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
      // Find the full path by searching in configured directories
      let fullPath = null;
      
      for (const directory of ragSettings.directories) {
        const candidatePath = path.join(directory, filePath);
        try {
          await fs.access(candidatePath);
          fullPath = candidatePath;
          break;
        } catch (error) {
          // File not found in this directory, continue searching
          continue;
        }
      }
      
      if (!fullPath) {
        throw new Error(`File not found in any configured directory: ${filePath}`);
      }
      
      console.log('Reading file:', fullPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        content,
        filePath: fullPath,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        fileName: path.basename(fullPath)
      };
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  });

  // PDF processing handler using pdf2json for Node.js compatibility
  ipcMain.handle('pdf:extract-text', async (event, buffer: ArrayBuffer) => {
    try {
      // Suppress PDF processing warnings
      const originalConsoleWarn = console.warn;
      const originalConsoleError = console.error;
      
      console.warn = (...args: any[]) => {
        try {
          const messageStr = args.map(arg => {
            try {
              if (typeof arg === 'string') return arg;
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            } catch (e) {
              return '[Object]';
            }
          }).join(' ');
          
          if (
            !messageStr.includes('Setting up fake worker') && 
            !messageStr.includes('TT: undefined function') &&
            !messageStr.includes('Unsupported: field.type of Link') &&
            !messageStr.includes('NOT valid form element') &&
            !messageStr.includes('Unsupported') &&
            !messageStr.includes('field.type') &&
            !messageStr.includes('form element')
          ) {
            originalConsoleWarn(...args);
          }
        } catch (e) {
          // If all else fails, just call the original
          originalConsoleWarn(...args);
        }
      };
      
      console.error = (...args: any[]) => {
        try {
          const messageStr = args.map(arg => {
            try {
              if (typeof arg === 'string') return arg;
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            } catch (e) {
              return '[Object]';
            }
          }).join(' ');
          
          if (
            !messageStr.includes('Unsupported: field.type of Link') &&
            !messageStr.includes('NOT valid form element') &&
            !messageStr.includes('Unsupported') &&
            !messageStr.includes('field.type') &&
            !messageStr.includes('form element')
          ) {
            originalConsoleError(...args);
          }
        } catch (e) {
          // If all else fails, just call the original
          originalConsoleError(...args);
        }
      };
      
      const PDFParser = (await import('pdf2json')).default;
      
      return new Promise((resolve) => {
        const pdfParser = new PDFParser();
        
        // Set up event handlers
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            let fullText = '';
            
            // Extract text from all pages
            if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
              pdfData.Pages.forEach((page: any, pageIndex: number) => {
                const pageNumber = pageIndex + 1;
                let pageText = '';
                
                if (page.Texts && Array.isArray(page.Texts)) {
                  pageText = page.Texts
                    .map((textItem: any) => {
                      if (textItem.R && Array.isArray(textItem.R)) {
                        return textItem.R
                          .map((run: any) => decodeURIComponent(run.T || ''))
                          .join('');
                      }
                      return '';
                    })
                    .filter((text: string) => text.trim())
                    .join(' ');
                }
                
                if (pageText.trim()) {
                  fullText += `Page ${pageNumber}:\n${pageText}\n\n`;
                }
              });
            }
            
            resolve({
              success: true,
              text: fullText.trim() || 'No extractable text found in this PDF.'
            });
          } catch (parseError) {
            console.error('PDF data parsing error:', parseError);
            resolve({
              success: false,
              error: 'Failed to parse PDF content'
            });
          }
        });
        
        pdfParser.on('pdfParser_dataError', (error: any) => {
          console.error('PDF parsing error:', error);
          resolve({
            success: false,
            error: error.parserError || 'Failed to parse PDF file'
          });
        });
        
        // Start parsing
        const pdfBuffer = Buffer.from(buffer);
        pdfParser.parseBuffer(pdfBuffer);
        
        // Restore console methods
        setTimeout(() => {
          console.warn = originalConsoleWarn;
          console.error = originalConsoleError;
        }, 100);
      });
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  });
}

// File content extraction functions for RAG indexing
async function extractFileContent(filePath: string, ext: string): Promise<string> {
  const fileName = path.basename(filePath);
  
  switch (ext.toLowerCase()) {
    case '.pdf':
      return await extractPdfText(filePath);
    case '.docx':
      return await extractDocxText(filePath);
    case '.doc':
      return await extractDocText(filePath);
    case '.xlsx':
    case '.xls':
      return await extractExcelText(filePath);
    case '.eml':
      return await extractEmlText(filePath);
    case '.msg':
      return await extractMsgText(filePath);
    case '.ppt':
    case '.pptx':
      return await extractPptText(filePath);
    default:
      return `${ext.toUpperCase().substring(1)} Document: ${fileName}\n\nUnsupported file format for text extraction.`;
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await new Promise<any>((resolve) => {
      // Suppress all PDF processing warnings
      const originalConsoleWarn = console.warn;
      const originalConsoleError = console.error;
      
      console.warn = (...args: any[]) => {
        try {
          // Convert all arguments to strings and filter out known PDF library warnings
          const messageStr = args.map(arg => {
            try {
              if (typeof arg === 'string') return arg;
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            } catch (e) {
              return '[Object]';
            }
          }).join(' ');
          
          if (
            !messageStr.includes('Setting up fake worker') && 
            !messageStr.includes('TT: undefined function') &&
            !messageStr.includes('Unsupported: field.type of Link') &&
            !messageStr.includes('NOT valid form element') &&
            !messageStr.includes('Unsupported') &&
            !messageStr.includes('field.type') &&
            !messageStr.includes('form element')
          ) {
            originalConsoleWarn(...args);
          }
        } catch (e) {
          originalConsoleWarn(...args);
        }
      };
      
      console.error = (...args: any[]) => {
        try {
          // Convert all arguments to strings and filter out known PDF library errors
          const messageStr = args.map(arg => {
            try {
              if (typeof arg === 'string') return arg;
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            } catch (e) {
              return '[Object]';
            }
          }).join(' ');
          
          if (
            !messageStr.includes('Unsupported: field.type of Link') &&
            !messageStr.includes('NOT valid form element') &&
            !messageStr.includes('Unsupported') &&
            !messageStr.includes('field.type') &&
            !messageStr.includes('form element')
          ) {
            originalConsoleError(...args);
          }
        } catch (e) {
          originalConsoleError(...args);
        }
      };
      
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser(null, 1); // Use silent mode
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let fullText = '';
          
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              const pageNumber = pageIndex + 1;
              let pageText = '';
              
              if (page.Texts && Array.isArray(page.Texts)) {
                pageText = page.Texts
                  .map((textItem: any) => {
                    if (textItem.R && Array.isArray(textItem.R)) {
                      return textItem.R
                        .map((run: any) => decodeURIComponent(run.T || ''))
                        .join('');
                    }
                    return '';
                  })
                  .filter((text: string) => text.trim())
                  .join(' ');
              }
              
              if (pageText.trim()) {
                fullText += `Page ${pageNumber}:\n${pageText}\n\n`;
              }
            });
          }
          
          resolve({
            success: true,
            text: fullText.trim() || 'No extractable text found in this PDF.'
          });
        } catch (parseError) {
          resolve({
            success: false,
            error: 'Failed to parse PDF content'
          });
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error: any) => {
        resolve({
          success: false,
          error: error.parserError || 'Failed to parse PDF file'
        });
      });
      
      pdfParser.parseBuffer(buffer);
      
      // Restore console methods after parsing completes
      setTimeout(() => {
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      }, 100);
    });
    
    if (result.success) {
      return `PDF Document: ${path.basename(filePath)}\n\n${result.text}`;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return `DOCX Document: ${path.basename(filePath)}\n\n${result.value}`;
  } catch (error) {
    throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractDocText(filePath: string): Promise<string> {
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(filePath);
    return `DOC Document: ${path.basename(filePath)}\n\n${extracted.getBody()}`;
  } catch (error) {
    throw new Error(`DOC processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractExcelText(filePath: string): Promise<string> {
  try {
    const XLSX = require('xlsx');
    
    // Configure XLSX to suppress warnings and handle unknown functions gracefully
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      try {
        const messageStr = args.map(arg => {
          try {
            if (typeof arg === 'string') return arg;
            if (typeof arg === 'object' && arg !== null) {
              return JSON.stringify(arg);
            }
            return String(arg);
          } catch (e) {
            return '[Object]';
          }
        }).join(' ');
        
        if (!messageStr.includes('TT: undefined function') && !messageStr.includes('Setting up fake worker')) {
          originalConsoleWarn(...args);
        }
      } catch (e) {
        originalConsoleWarn(...args);
      }
    };
    
    const workbook = XLSX.readFile(filePath, {
      cellFormula: false,  // Don't process formulas to avoid undefined function warnings
      cellHTML: false,     // Don't convert to HTML
      cellText: true,      // Get text values only
      cellDates: true,     // Convert dates properly
      sheetStubs: false    // Don't include empty cells
    });
    
    // Restore console.warn
    console.warn = originalConsoleWarn;
    
    let content = `Excel Document: ${path.basename(filePath)}\n\n`;
    
    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      if (csvData.trim()) {
        content += `Sheet: ${sheetName}\n${csvData}\n\n`;
      }
    });
    
    return content;
  } catch (error) {
    throw new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractEmlText(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    let body = '';
    let inBody = false;
    
    for (const line of lines) {
      if (!inBody) {
        if (line.toLowerCase().startsWith('subject:')) {
          subject = line.substring(8).trim();
        } else if (line.toLowerCase().startsWith('from:')) {
          from = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('to:')) {
          to = line.substring(3).trim();
        } else if (line.toLowerCase().startsWith('date:')) {
          date = line.substring(5).trim();
        } else if (line.trim() === '') {
          inBody = true;
        }
      } else {
        body += line + '\n';
      }
    }
    
    return `Email: ${path.basename(filePath)}\n\nFrom: ${from}\nTo: ${to}\nDate: ${date}\nSubject: ${subject}\n\n${body.trim()}`;
  } catch (error) {
    throw new Error(`EML processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractMsgText(filePath: string): Promise<string> {
  try {
    const MsgReader = require('@kenjiuno/msgreader').default;
    const buffer = await fs.readFile(filePath);
    const msgReader = new MsgReader(buffer);
    const fileData = msgReader.getFileData();
    
    if (!fileData.error) {
      const subject = fileData.subject || 'No Subject';
      const senderName = fileData.senderName || 'Unknown Sender';
      const body = fileData.body || 'No Body Content';
      
      return `Outlook Message: ${path.basename(filePath)}\n\nFrom: ${senderName}\nSubject: ${subject}\n\n${body}`;
    } else {
      throw new Error(fileData.error);
    }
  } catch (error) {
    throw new Error(`MSG processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractPptText(filePath: string): Promise<string> {
  // PowerPoint processing is complex and requires specialized libraries
  // For now, provide a basic implementation that indicates the file type
  return `PowerPoint Document: ${path.basename(filePath)}\n\nNote: PowerPoint text extraction is not yet fully implemented. Consider exporting slides to PDF or text format for better indexing.`;
}

// Helper functions for RAG
// Incremental indexing helper functions
const isFileChanged = async (filePath: string, existingChunk?: DocumentChunk): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    if (!existingChunk) return true; // New file
    
    // Check if file has been modified or size changed
    return stats.mtime.getTime() !== existingChunk.lastModified || 
           stats.size !== existingChunk.size;
  } catch (error) {
    return false; // File doesn't exist anymore
  }
};

const cleanupDeletedFiles = async (): Promise<void> => {
  const filesToRemove: number[] = [];
  
  for (let i = 0; i < ragDatabase.length; i++) {
    const chunk = ragDatabase[i];
    try {
      await fs.access(chunk.file);
    } catch {
      // File no longer exists, mark for removal
      filesToRemove.push(i);
    }
  }
  
  // Remove in reverse order to maintain indices
  for (let i = filesToRemove.length - 1; i >= 0; i--) {
    ragDatabase.splice(filesToRemove[i], 1);
  }
  
  if (filesToRemove.length > 0) {
    loggers.rag('Removed chunks for deleted files', { removedCount: filesToRemove.length });
  }
};

const removeChunksForFile = (filePath: string): void => {
  const initialLength = ragDatabase.length;
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Remove all chunks for this file
  for (let i = ragDatabase.length - 1; i >= 0; i--) {
    const chunk = ragDatabase[i];
    if (chunk.file === relativePath || chunk.file === filePath) {
      ragDatabase.splice(i, 1);
    }
  }
  
  const removedCount = initialLength - ragDatabase.length;
  if (removedCount > 0) {
    loggers.rag('Removed old chunks for updated file', { 
      file: path.basename(filePath), 
      removedChunks: removedCount 
    });
  }
};

const processIndividualFile = async (filePath: string): Promise<void> => {
  try {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const content = await extractFileContent(filePath, ext);
    
    if (!content || content.trim().length === 0) {
      loggers.file('Skipping empty file', { file: path.basename(filePath) });
      return;
    }
    
    // Split content into chunks (paragraphs)
    const chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50);
    
    if (chunks.length === 0) {
      // If no good chunks, store the whole content
      chunks.push(content.trim());
    }
    
    // Add chunks to RAG database with relative path for consistency
    const directory = ragSettings.directories.find(dir => filePath.startsWith(dir)) || process.cwd();
    const relativePath = path.relative(directory, filePath);
    
    for (const chunk of chunks) {
      ragDatabase.push({
        content: chunk.trim(),
        file: relativePath,
        lastModified: stats.mtime.getTime(),
        indexed: Date.now(),
        size: stats.size
      });
    }
    
    loggers.file('File indexed successfully', {
      file: path.basename(filePath),
      chunks: chunks.length,
      size: stats.size
    });
    
  } catch (error) {
    loggers.error('Failed to process individual file', error, { file: filePath });
    throw error;
  }
};

async function indexAllDirectories(): Promise<void> {
  try {
    // Don't clear existing data - we'll do incremental updates
    loggers.rag('Starting incremental RAG indexing');
    
    // First, clean up any chunks for files that no longer exist
    await cleanupDeletedFiles();
    
    // Collect files that need processing (new or changed files only)
    const filesToProcess: string[] = [];
    const skippedFiles: string[] = [];
    const supportedExtensions = ['.md', '.txt', '.json', '.csv', '.mmd', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.eml', '.msg'];
    
    // Create a lookup map for existing chunks by file path
    const existingChunksMap = new Map<string, DocumentChunk>();
    ragDatabase.forEach(chunk => {
      // Handle both relative and absolute paths
      const normalizedPath = path.isAbsolute(chunk.file) ? chunk.file : path.resolve(chunk.file);
      existingChunksMap.set(normalizedPath, chunk);
    });
    
    for (const directory of ragSettings.directories) {
      if (directory && directory.trim()) {
        loggers.rag('Scanning directory for changes', { directory });
        const files = await getFilesRecursively(directory);
        const supportedFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return supportedExtensions.includes(ext);
        });
        
        // Check each file to see if it needs processing
        for (const file of supportedFiles) {
          const existingChunk = existingChunksMap.get(file);
          const hasChanged = await isFileChanged(file, existingChunk);
          
          if (hasChanged) {
            filesToProcess.push(file);
            if (existingChunk) {
              loggers.rag('File changed, will reindex', { 
                file: path.basename(file),
                lastModified: new Date(existingChunk.lastModified).toISOString()
              });
            }
          } else {
            skippedFiles.push(file);
          }
        }
      }
    }
    
    loggers.rag('File processing summary', { 
      totalFiles: filesToProcess.length + skippedFiles.length,
      toProcess: filesToProcess.length, 
      skipped: skippedFiles.length 
    });
    
    if (filesToProcess.length === 0) {
      if (mainWindow) {
        mainWindow.webContents.send('rag:indexing-status', { 
          isIndexing: false, 
          message: skippedFiles.length > 0 ? 'All files are up to date' : 'No supported files found in selected directories',
          documentCount: ragDatabase.length,
          indexingProgress: 100
        });
      }
      return;
    }
    
    // Process only the files that need updating
    let processedFiles = 0;
    const totalFiles = filesToProcess.length;
    
    for (const filePath of filesToProcess) {
      try {
        if (mainWindow) {
          mainWindow.webContents.send('rag:indexing-status', { 
            isIndexing: true, 
            message: `Processing: ${path.basename(filePath)}...`,
            indexingProgress: Math.round((processedFiles / totalFiles) * 100)
          });
        }
        
        // Remove old chunks for this file before processing
        removeChunksForFile(filePath);
        
        // Process the individual file
        await processIndividualFile(filePath);
        processedFiles++;
        
        loggers.file('File processed for RAG', { 
          file: path.basename(filePath),
          progress: `${processedFiles}/${totalFiles}`
        });
        
      } catch (error) {
        loggers.error('Error processing file for RAG', error, { 
          file: filePath,
          progress: `${processedFiles}/${totalFiles}`
        });
        processedFiles++; // Still count as processed to maintain progress
      }
    }
    
    ragSettings.lastIndexed = Date.now();
    
    // Save the updated database to disk
    try {
      await saveRAGDatabase();
      loggers.rag('RAG database saved after incremental indexing');
    } catch (error) {
      loggers.error('Failed to save RAG database after indexing', error);
    }
    
    if (mainWindow) {
      const processedCount = filesToProcess.length;
      const message = processedCount > 0 
        ? `Updated ${processedCount} files, ${ragDatabase.length} total documents indexed`
        : `All files up to date, ${ragDatabase.length} documents available`;
        
      mainWindow.webContents.send('rag:indexing-status', { 
        isIndexing: false, 
        message,
        documentCount: ragDatabase.length,
        lastIndexed: ragSettings.lastIndexed,
        indexingProgress: 100
      });
    }
  } catch (error) {
    console.error('Error indexing all directories:', error);
    throw error;
  }
}

async function indexDocuments(directory: string, clearFirst: boolean = true, totalFiles: number = 0, currentProgress: number = 0): Promise<number> {
  try {
    loggers.rag('Starting document indexing', { directory, clearFirst, totalFiles });
    
    const files = await getFilesRecursively(directory);
    const supportedExtensions = ['.md', '.txt', '.json', '.csv', '.mmd', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.eml', '.msg'];
    
    if (clearFirst) {
      ragDatabase.length = 0; // Clear existing data
      loggers.rag('Cleared existing RAG database');
    }
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        try {
          const stats = await fs.stat(file);
          let processedContent = '';
          
          // Handle different file types appropriately
          if (['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.eml', '.msg'].includes(ext)) {
            // Extract content from complex file formats (don't read as UTF-8 first)
            try {
              const extractStartTime = Date.now();
              loggers.file(`Processing ${ext} file for RAG`, { file: path.basename(file), extension: ext });
              processedContent = await extractFileContent(file, ext);
              loggers.performance(`File extraction (${ext})`, Date.now() - extractStartTime);
            } catch (extractError) {
              loggers.error(`Error extracting content from file`, extractError, { 
                file: path.basename(file), 
                extension: ext,
                fullPath: file
              });
              processedContent = `${ext.toUpperCase().substring(1)} Document: ${path.basename(file)}\n\nError: Could not extract text content from this file.`;
            }
          } else {
            // Read text-based files as UTF-8
            const content = await fs.readFile(file, 'utf-8');
            
            if (ext === '.csv') {
              // Convert CSV to readable format
              const lines = content.split('\n');
              if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                processedContent = `CSV File: ${path.basename(file)}\nColumns: ${headers.join(', ')}\n\nData:\n${content}`;
              } else {
                processedContent = `CSV File: ${path.basename(file)}\n\n${content}`;
              }
            } else if (ext === '.json') {
              // Pretty format JSON for better readability
              try {
                const parsed = JSON.parse(content);
                processedContent = `JSON File: ${path.basename(file)}\n\n${JSON.stringify(parsed, null, 2)}`;
              } catch (jsonError) {
                processedContent = `JSON File: ${path.basename(file)}\n\n${content}`;
              }
            } else if (ext === '.md') {
              processedContent = `Markdown File: ${path.basename(file)}\n\n${content}`;
            } else if (ext === '.txt') {
              processedContent = `Text File: ${path.basename(file)}\n\n${content}`;
            } else if (ext === '.mmd') {
              processedContent = `Mermaid Diagram: ${path.basename(file)}\n\n${content}`;
            } else {
              // Default text processing for any other supported formats
              processedContent = `${ext.toUpperCase().substring(1)} File: ${path.basename(file)}\n\n${content}`;
            }
          }
          
          // Simple chunking by paragraphs
          const chunks = processedContent.split('\n\n').filter(chunk => chunk.trim().length > 50);
          
          // If no chunks found (like single-line CSV), use the whole content
          if (chunks.length === 0 && processedContent.trim().length > 50) {
            chunks.push(processedContent.trim());
          }
          
          for (const chunk of chunks) {
            ragDatabase.push({
              content: chunk.trim(),
              file: path.relative(directory, file),
              lastModified: stats.mtime.getTime(),
              indexed: Date.now(),
              size: stats.size
            });
          }
          
          // Update progress if we're tracking it
          if (totalFiles > 0 && mainWindow) {
            currentProgress++;
            const progressPercent = Math.round((currentProgress / totalFiles) * 100);
            mainWindow.webContents.send('rag:indexing-status', { 
              isIndexing: true, 
              message: `Indexed: ${path.basename(file)} (${ext.toUpperCase()})`,
              indexingProgress: progressPercent
            });
          } else if (mainWindow) {
            mainWindow.webContents.send('rag:indexing-status', { 
              isIndexing: true, 
              message: `Indexed: ${path.basename(file)} (${ext.toUpperCase()})` 
            });
          }
        } catch (fileError) {
          console.error(`Error indexing file ${file}:`, fileError);
        }
      }
    }
    
    return currentProgress;
  } catch (error) {
    console.error('Error indexing documents:', error);
    throw error;
  }
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

function extractSnippet(content: string, query: string, contextLength = 100): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) {
    return content.substring(0, contextLength) + '...';
  }
  
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(content.length, index + query.length + contextLength / 2);
  
  return '...' + content.substring(start, end) + '...';
}

// Auto-indexing functions
function startAutoIndexing() {
  // Check every hour if we need to re-index (daily check)
  autoIndexTimer = setInterval(async () => {
    if (ragSettings.directories.length > 0 && !ragSettings.isIndexing) {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (ragSettings.lastIndexed < oneDayAgo) {
        console.log('Auto-indexing RAG directories (daily check):', ragSettings.directories);
        try {
          await indexAllDirectories();
        } catch (error) {
          console.error('Auto-indexing failed:', error);
        }
      }
    }
  }, 60 * 60 * 1000); // Check every hour

  // Also check immediately on startup if we have a directory set
  setTimeout(checkAndAutoIndex, 5000); // Wait 5 seconds after app start
}

async function checkAndAutoIndex() {
  // Check if we have directories to index
  if (ragSettings.directories.length > 0 && !ragSettings.isIndexing) {
    const sixHoursAgo = Date.now() - (1 * 60 * 1000); // Temporarily set to 1 minute for testing
    if (ragSettings.lastIndexed < sixHoursAgo) {
      console.log('Auto-indexing RAG directories on startup:', ragSettings.directories);
      try {
        await indexAllDirectories();
      } catch (error) {
        console.error('Startup auto-indexing failed:', error);
      }
    }
  }
}

// Model installation function
async function installDefaultModel() {
  const modelName = 'qwen3:4b';
  console.log('Installing default model:', modelName);
  
  try {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start model installation');
    }
    
    // Stream the installation progress
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    
    if (mainWindow) {
      mainWindow.webContents.send('ollama:pull:progress', {
        status: 'pulling',
        message: `Installing default model: ${modelName}...`
      });
    }
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (mainWindow) {
              mainWindow.webContents.send('ollama:pull:progress', parsed);
            }
            if (parsed.status === 'success') {
              console.log('Default model installation completed');
              return true;
            }
          } catch (parseError) {
            console.log('Failed to parse installation progress:', line);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to install default model:', error);
    if (mainWindow) {
      mainWindow.webContents.send('ollama:pull:progress', {
        status: 'error',
        message: `Failed to install ${modelName}: ${error.message}`
      });
    }
    throw error;
  }
}

// Clean up timer on app quit
app.on('before-quit', () => {
  loggers.shutdown('App quitting - cleaning up');
  
  if (autoIndexTimer) {
    clearInterval(autoIndexTimer);
    autoIndexTimer = null;
  }
  
  // Close logger transports
  logger.close();
});