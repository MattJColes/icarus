# Icarus Architecture Documentation

## Overview

Icarus is a sophisticated desktop AI assistant built with **Electron**, **React**, and **TypeScript**. The application provides a seamless interface for interacting with local LLMs via **Ollama**, featuring advanced capabilities like RAG (Retrieval-Augmented Generation), intelligent document processing, real-time streaming responses, and comprehensive file format support.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Icarus Desktop App                       │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   App-full.tsx  │ │  Components/    │ │     Hooks/      │   │
│  │   (Main App)    │ │  - Message      │ │  - useFileHandling│  │
│  │                 │ │  - Settings     │ │  - State Mgmt   │   │
│  │                 │ │  - Layout       │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  IPC Communication Layer                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Bi-directional Message Passing (Settings, Chat, RAG)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Electron Main Process)                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   main.ts       │ │  File Processing│ │   RAG System    │   │
│  │  - IPC Handlers │ │  - PDF, DOC,    │ │  - Indexing     │   │
│  │  - Settings     │ │    XLSX, etc.   │ │  - Search       │   │
│  │  - Ollama API   │ │  - 15+ formats  │ │  - Embedding    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Ollama API    │ │  File System    │ │   OS Services   │   │
│  │  - Model Mgmt   │ │  - Document     │ │  - File Explorer│   │
│  │  - Chat Stream  │ │    Storage      │ │  - Notifications│   │
│  │  - Embeddings   │ │  - Settings     │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Architecture

#### **Main Application (App-full.tsx)**
- **Purpose**: Primary application controller and UI orchestrator
- **Responsibilities**:
  - Application state management (conversations, settings, streaming)
  - Message processing and queue management
  - Document writing mode coordination
  - RAG integration and source management
  - Real-time streaming response handling

#### **Component Hierarchy**
```
App-full.tsx
├── Settings Panel
│   ├── Model Selection & Installation
│   ├── RAG Configuration
│   ├── Advanced Parameters
│   └── Document Writing Mode
├── Chat Interface
│   ├── Message List
│   │   ├── Message Component
│   │   │   ├── Content Rendering (Markdown)
│   │   │   ├── Thinking Display
│   │   │   ├── RAG Sources
│   │   │   ├── Clarifying Questions
│   │   │   └── Document Mode Indicators
│   │   └── File Attachments
│   ├── Input Area
│   │   ├── Text Input (Auto-resize)
│   │   ├── File Upload (Drag & Drop)
│   │   └── Queue Status
│   └── Header
│       ├── Model Status & Capabilities
│       ├── Connection Indicator
│       └── Feature Badges
└── Sidebar
    ├── Conversation List
    ├── New Chat Button
    └── Settings Access
```

#### **State Management**
- **Local React State**: Primary state management using hooks
- **Persistent Storage**: Settings and conversations via Electron IPC
- **Real-time Updates**: Streaming responses and queue management
- **Cross-Component Communication**: Props and callback patterns

### Backend Architecture (Electron Main Process)

#### **Core Services (main.ts)**

##### **IPC Handler System**
```typescript
// Service-based architecture with comprehensive handlers
ipcMain.handle('settings:load', async () => { /* Settings persistence */ });
ipcMain.handle('conversations:save', async (data) => { /* Chat history */ });
ipcMain.handle('ollama:chat', async (data) => { /* Streaming chat */ });
ipcMain.handle('rag:index', async (directories) => { /* Document indexing */ });
ipcMain.handle('file:process', async (file) => { /* File extraction */ });
```

##### **Model Management System**
- **Model Discovery**: Automatic detection of installed Ollama models
- **Capability Detection**: Thinking and vision support identification
- **Installation Pipeline**: Model download with progress tracking
- **Validation**: Model availability and compatibility checking

##### **Streaming Architecture**
```typescript
// Real-time streaming implementation
async function chatStream(request) {
  for await (const response of ollamaService.chatStream(request)) {
    // Immediate streaming to renderer
    mainWindow.webContents.send('ollama:chat:stream', response);
    
    // Accumulate for final storage
    fullResponse += response.content;
  }
  return fullResponse;
}
```

### File Processing System

#### **Supported Formats & Processing**

| Format Category | Extensions | Processing Library | Capabilities |
|----------------|------------|-------------------|--------------|
| **Text Files** | .txt, .md, .json, .csv, .mmd | Native Node.js | Direct UTF-8 reading |
| **PDF Documents** | .pdf | pdf2json | Page-by-page text extraction |
| **Microsoft Word** | .docx, .doc | mammoth, word-extractor | Complete text extraction |
| **Microsoft Excel** | .xlsx, .xls | xlsx | Sheet data as CSV format |
| **Microsoft PowerPoint** | .pptx, .ppt | Basic detection | Format recognition |
| **Email Files** | .eml, .msg | Native parsing, @kenjiuno/msgreader | Headers + body extraction |
| **Images** | .png, .jpg, .jpeg, .gif, .webp | Base64 encoding | Vision model input |

#### **Processing Pipeline**
```typescript
// Intelligent file processing workflow
async function processFile(filePath: string, extension: string) {
  if (isTextBased(extension)) {
    return await fs.readFile(filePath, 'utf-8');
  } else if (isComplexFormat(extension)) {
    return await extractFileContent(filePath, extension);
  }
}

// Specialized extractors
const extractors = {
  '.pdf': extractPdfText,      // pdf2json with page-by-page
  '.docx': extractDocxText,    // mammoth for modern Word
  '.doc': extractDocText,      // word-extractor for legacy
  '.xlsx': extractExcelText,   // xlsx with sheet processing
  '.eml': extractEmlText,      // Email header + body parsing
  '.msg': extractMsgText       // Outlook message extraction
};
```

### RAG (Retrieval-Augmented Generation) System

#### **Architecture Overview**
```
Document Sources → Indexing Pipeline → Vector Search → Context Injection
      ↓                    ↓                ↓              ↓
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│Multi-dir    │   │Text Extract │   │Embedding    │   │Chat Context │
│Support      │→  │Chunking     │→  │Search       │→  │Integration  │
│(up to 3)    │   │Filtering    │   │Similarity   │   │Source Links │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

#### **Indexing Process**
1. **Directory Scanning**: Recursive file discovery with format filtering
2. **Content Extraction**: Format-specific text extraction
3. **Intelligent Chunking**: Paragraph-based segmentation with minimum length
4. **Metadata Storage**: File paths, modification times, and content mapping
5. **Progress Tracking**: Real-time indexing status with file counts

#### **Search Implementation**
```typescript
// Configurable similarity search
interface RAGSearch {
  query: string;
  sensitivity: number;     // 10-100% threshold
  maxResults: number;      // Result limiting
  directories: string[];   // Multi-directory support
}

// Vector-based similarity matching
function searchDocuments(query: string, sensitivity: number): RagSource[] {
  const results = ragDatabase
    .map(doc => ({ doc, score: calculateSimilarity(query, doc.content) }))
    .filter(result => result.score >= (sensitivity / 100))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  return results.map(result => result.doc);
}
```

### Document Writing System

#### **Intelligent Document Creation Workflow**

##### **Document Type Detection**
```typescript
// AI-powered document type identification
const documentTypes = [
  'Technical Design Document',
  'High-Level Design Document', 
  'Amazon PRFAQ',
  'Amazon 6-Page Narrative',
  'Business Plan',
  'Research Report'
];

// Structured analysis prompt
const analysisPrompt = `
Analyze the user's request to determine if they're asking for a structured document.
Evaluate information sufficiency for comprehensive document creation.
Respond with: DOCUMENT_TYPE, INFORMATION_NEEDED/SUMMARY, READY_TO_PROCEED
`;
```

##### **Information Assessment Engine**
```typescript
// Two-path response system
interface DocumentAnalysis {
  documentType?: string;           // Detected document type
  informationNeeded?: string[];    // Required information categories
  informationSummary?: string;     // Current understanding summary
  readyToProceed?: boolean;        // Readiness for document creation
  clarifyingQuestions?: string[];  // Targeted questions
}

// Assessment criteria
const assessmentCategories = [
  'Requirements and objectives',
  'Target audience and scope', 
  'Technical specifications',
  'Success criteria and metrics',
  'Timeline and constraints'
];
```

#### **Interactive UI Components**
- **📄 Document Type Badge**: Visual identification of document type
- **ℹ️ Information Needed Cards**: Blue-themed requirement lists
- **📝 Information Summary**: Green-themed understanding display
- **✅/⏳ Ready Status**: Visual readiness indicators
- **Action Buttons**: "Proceed with Document" and "Provide More Info"

### Model Capability System

#### **Detection Architecture**
```typescript
// Multi-layer capability detection
interface ModelCapabilities {
  supportsThinking: boolean;    // Reasoning capabilities
  supportsVision: boolean;      // Image processing
  contextLength: number;        // Token capacity
}

// Pattern-based detection
const detectionPatterns = {
  thinking: ['qwen3', 'deepseek', 'r1', 'o1', 'chain-of-thought'],
  vision: ['llava', 'minicpm', 'qwen2-vl', 'qwen2.5-vision', 'gemma-vision', 'pixtral']
};
```

#### **Visual Indicators**
- **🧠 Thinking Badge**: Blue-themed for reasoning models
- **🖼️ Vision Badge**: Purple-themed for multimodal models
- **📚 RAG Badge**: App-themed for document search
- **Connection Status**: Green/red dot for Ollama connectivity

### Data Storage & Persistence

#### **File-based Storage System**
```
userData/
├── helios-settings.json          # Application settings
├── helios-conversations.json     # Chat history
└── rag-cache/                    # RAG indexing cache
    ├── documents.db              # In-memory database
    └── embeddings.cache          # Vector cache
```

#### **Settings Schema**
```typescript
interface Settings {
  // Core Configuration
  selectedModel: string;
  showThinking: boolean;
  ragEnabled: boolean;
  ragDirectories: string[];        // Up to 3 directories
  ragSensitivity: number;          // 10-100% threshold
  turnBasedThinking: boolean;      // Document writing mode
  systemPrompt: string;            // Custom AI personality
  
  // Model Parameters
  temperature: number;             // 0.0-1.0
  contextLength: number;           // 512-8192 tokens
  topP: number;                    // 0.1-1.0
  topK: number;                    // 1-100
  repeatPenalty: number;           // 0.5-2.0
}
```

#### **Conversation Schema**
```typescript
interface Conversation {
  id: string;
  title: string;                   // AI-generated
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinking?: string;               // Model reasoning
  ragSources?: RagSource[];        // Document references
  attachments?: FileAttachment[];
  clarifyingQuestions?: string[];
  
  // Document Mode Fields
  documentType?: string;
  informationNeeded?: string[];
  informationSummary?: string;
  readyToProceed?: boolean;
}
```

### Communication Protocols

#### **IPC Message Types**
```typescript
// Settings Management
'settings:load' | 'settings:save'

// Conversation Management  
'conversations:load' | 'conversations:save' | 'conversations:delete'

// Model Operations
'ollama:list' | 'ollama:model-info' | 'ollama:pull' | 'ollama:chat'

// RAG Operations
'rag:index' | 'rag:search' | 'rag:clear' | 'rag:status'

// File Operations
'file:process' | 'file:open-explorer' | 'dialog:select-directory'

// Streaming Events
'ollama:chat:stream' | 'rag:indexing-status' | 'ollama:pull:progress'
```

#### **Streaming Protocol**
```typescript
// Real-time streaming events
interface StreamingMessage {
  content: string;      // Accumulated content
  thinking: string;     // Reasoning process
  isComplete: boolean;  // Stream completion status
}

// Queue management
interface QueuedMessage {
  id: string;
  content: string;
  attachments: FileAttachment[];
  timestamp: Date;
}
```

### Security & Privacy

#### **Local-First Architecture**
- **No External APIs**: All processing happens locally via Ollama
- **Private Conversations**: Chat history stored locally only  
- **Document Security**: Files never leave the local machine
- **No Telemetry**: Zero usage tracking or data collection

#### **File System Security**
- **Sandboxed Processing**: File operations within app boundaries
- **Permission Validation**: Directory access verification
- **Safe File Handling**: Malicious file protection
- **Resource Limits**: File size and processing timeouts

### Performance Optimization

#### **Streaming Optimizations**
- **Chunked Processing**: Real-time response rendering
- **Buffer Management**: Efficient memory usage
- **Queue System**: Concurrent message handling
- **Progress Tracking**: User feedback during operations

#### **RAG Performance**
- **Intelligent Chunking**: Optimal search granularity
- **Similarity Caching**: Fast repeated searches
- **Lazy Loading**: On-demand document processing
- **Memory Management**: Efficient index storage

#### **UI Performance**
- **Virtual Scrolling**: Large conversation handling
- **Component Memoization**: React optimization
- **Debounced Updates**: Smooth streaming display
- **Asset Optimization**: Fast application startup

### Development Architecture

#### **Build System**
```json
{
  "scripts": {
    "dev": "vite dev",                    // Hot reload development
    "build": "tsc -b && vite build",      // TypeScript compilation
    "test": "jest",                       // Unit testing
    "package": "electron-forge package"   // Application packaging
  }
}
```

#### **Code Quality**
- **TypeScript**: Strict type checking with comprehensive interfaces
- **ESLint**: Code quality and consistency enforcement
- **Testing**: Jest with React Testing Library for component tests
- **Documentation**: Comprehensive inline documentation

#### **Dependency Management**
```typescript
// Core Dependencies
"electron": "Latest",           // Desktop application framework
"react": "18.x",               // UI framework  
"typescript": "5.x",           // Type safety
"vite": "Latest",              // Build tooling

// File Processing
"pdf2json": "3.1.6",          // PDF text extraction
"mammoth": "1.9.1",           // DOCX processing
"word-extractor": "1.0.4",    // DOC legacy support
"xlsx": "0.18.5",             // Excel processing
"@kenjiuno/msgreader": "1.23.0" // MSG email parsing
```

### Deployment Architecture

#### **Electron Packaging**
- **Multi-platform**: Windows, macOS, Linux support
- **Auto-updater**: Seamless application updates
- **Native Integration**: OS-specific features and styling
- **Resource Bundling**: Optimized asset packaging

#### **Distribution Strategy**
- **Direct Download**: GitHub releases with platform-specific binaries
- **Package Managers**: Future Homebrew, Chocolatey support
- **Auto-updates**: Background update checking and installation
- **Version Management**: Semantic versioning with changelog

### Future Architecture Considerations

#### **Scalability Enhancements**
- **Plugin System**: Extensible functionality architecture
- **Custom Models**: Local model training and fine-tuning
- **Advanced RAG**: Vector database integration (ChromaDB, Pinecone)
- **Collaboration**: Multi-user conversation sharing

#### **Performance Improvements**
- **WebWorkers**: Background processing for heavy operations
- **Streaming Optimization**: Enhanced real-time performance
- **Memory Management**: Large document handling improvements
- **Caching Strategy**: Intelligent content and embedding caching

## Conclusion

Icarus represents a sophisticated, privacy-first desktop AI assistant architecture that balances powerful functionality with local processing requirements. The modular design enables rapid feature development while maintaining performance and user experience quality.

The architecture successfully integrates complex document processing, intelligent AI interactions, and real-time streaming capabilities into a cohesive, user-friendly application that respects privacy and provides professional-grade functionality for document creation and AI assistance.