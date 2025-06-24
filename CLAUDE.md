# Icarus - Desktop AI Assistant

## Project Overview

Icarus is a desktop AI assistant application built with Electron, React, and TypeScript. It provides a beautiful, intuitive interface for interacting with local LLMs via Ollama, with advanced features like RAG (Retrieval-Augmented Generation), thinking transparency, intelligent document processing, real-time streaming responses, and seamless conversation management with truly blank new chats.

## Key Features

### Core Functionality
- **Local LLM Integration**: Seamless integration with Ollama for private, local AI conversations
- **Real-Time Streaming**: Live streaming chat responses with proper buffer management and error handling
- **RAG System**: Document indexing and retrieval for context-aware responses with multiple directory support
- **Thinking Transparency**: Real-time display of model reasoning process during streaming
- **Multi-modal Support**: Text, image, and comprehensive document processing capabilities
- **Conversation Persistence**: Automatic chat history saved between sessions with individual deletion
- **AI-Powered Chat Naming**: Intelligent titles generated and updated for every conversation
- **File Explorer Integration**: Click RAG sources to open files in system explorer/Finder
- **Intelligent Document Writing Mode**: Advanced document creation with intelligent information gathering, clarifying questions, and confirmation workflow for technical designs, PRFAQs, business plans, and research reports
- **Custom System Prompts**: User-defined system prompts for personalized AI behavior and personality
- **Advanced Model Controls**: Configurable temperature, context length, top-P, top-K, and repeat penalty with reset to defaults
- **Truly Blank New Chats**: New chat button completely clears all UI state for fresh conversations
- **Interactive RAG Sources**: Clickable document sources in chat messages with file explorer integration

### Enhanced File Processing Support
**✅ Complete File Format Coverage:**
- **Text Files**: .txt, .md, .json, .csv, .mmd (Mermaid diagrams)
- **Images**: .png, .jpg, .jpeg, .gif, .webp (base64 encoding, 10MB limit)
- **PDF Documents**: .pdf (full text extraction with page-by-page processing)
- **Microsoft Word**: .doc (legacy format support), .docx (complete text extraction)
- **Microsoft Excel**: .xls, .xlsx (sheet data extraction with CSV formatting)
- **Microsoft PowerPoint**: .ppt (basic support), .pptx (enhanced compatibility)
- **Email**: .eml (header and content parsing), .msg (Outlook message parsing)

### UI/UX Design
- **Icarus Theme**: Custom maroon-purple gradient color scheme (#5D2E46 to #7B3F61)
- **Responsive Design**: Collapsible sidebar and adaptive layout with enhanced minimized spacing
- **Dark Mode**: Professional dark theme optimized for long usage sessions
- **Visual Feedback**: Loading states, progress indicators, and real-time streaming displays
- **Enhanced Branding**: 25% larger Icarus logo and title with adaptive visibility
- **Interactive RAG Sources**: Dual-button system for file exploration and content viewing
- **Model Capability Indicators**: Visual badges showing Thinking and Vision support for current model

## Intelligent Document Writing System

### Advanced Document Creation Workflow

Icarus features a sophisticated document writing mode that intelligently assists with creating structured documents including:

- **Technical Design Documents** - System architecture, API designs, technical specifications
- **High-Level Design Documents** - System overviews, component diagrams, data flows
- **Amazon PRFAQs** - Press release and frequently asked questions format
- **Amazon 6-Page Narratives** - Detailed project proposals and business cases
- **Business Plans** - Market analysis, financial projections, strategy documents
- **Research Reports** - Literature reviews, analysis reports, investigation summaries

### Intelligent Information Assessment

When document writing mode is enabled, the AI automatically:

1. **Document Type Detection**: Recognizes requests for structured documents vs. regular chat
2. **Information Sufficiency Analysis**: Evaluates if enough details exist for comprehensive document creation
3. **Requirement Assessment**: Considers objectives, scope, audience, success metrics, and constraints

### Two-Path Response System

#### Path A: Insufficient Information
**Format**: `DOCUMENT_TYPE` + `INFORMATION_NEEDED` + `CLARIFYING_QUESTIONS`

- AI identifies the document type (e.g., "Technical Design Document")
- Lists specific information categories needed
- Provides targeted clarifying questions about:
  - Requirements and objectives
  - Target audience and scope
  - Technical specifications
  - Success criteria and metrics
  - Timeline and resource constraints

#### Path B: Sufficient Information
**Format**: `DOCUMENT_TYPE` + `INFORMATION_SUMMARY` + `READY_TO_PROCEED`

- AI summarizes current understanding of requirements
- Highlights key points that will be addressed
- Presents clear next-step options:
  - **"Proceed with Document"** - Begin structured document creation
  - **"Provide More Info"** - Add additional context before proceeding

### Enhanced UI Components

#### Visual Status Indicators
- **📄 Document Type Badge**: Shows detected document type with custom styling
- **ℹ️ Information Needed**: Blue-themed cards listing required information
- **📝 Information Summary**: Green-themed summary of current understanding
- **✅/⏳ Ready Status**: Visual indicator of readiness to proceed with creation

#### Interactive Elements
- **Clickable Questions**: One-click responses to clarifying questions
- **Action Buttons**: Clear "Proceed" and "Provide More Info" options
- **Status Communication**: Always shows current position in the workflow

### Document Creation Workflow

1. **User Request**: "Help me create a technical design for a microservices architecture"
2. **AI Analysis**: Detects technical design document request
3. **Information Assessment**: Evaluates if sufficient details are provided
4. **Response Path**:
   - **If insufficient**: Lists needed information + asks clarifying questions
   - **If sufficient**: Provides summary + confirmation to proceed
5. **Information Gathering**: Iterative question-answer cycle until requirements are complete
6. **Document Creation**: Structured document generation following best practices
7. **Refinement**: User can request modifications or additions

### Settings Integration

**Enhanced Settings Panel**:
- **Toggle**: "Intelligent Document Writing Mode" 
- **Description**: Explains functionality for technical designs, PRFAQs, business plans
- **Visual Design**: Consistent with application theme and other feature toggles

## Technical Architecture

> **📋 For detailed technical documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

Icarus uses a modern Electron + React + TypeScript stack with a service-based backend architecture:

### Core Architecture
- **Frontend**: React 18 with TypeScript for type-safe UI development
- **Backend**: Electron main process with comprehensive IPC handlers
- **Communication**: Real-time streaming via IPC with proper buffer management
- **Storage**: Local JSON-based persistence for privacy and performance
- **AI Integration**: Direct Ollama API integration for local LLM processing

### Key Technical Features
- **Service-Based Backend**: Modular IPC handlers for all major functionality
- **Real-Time Streaming**: Live chat responses with thinking transparency
- **Advanced File Processing**: 15+ format support with specialized extractors
- **Intelligent RAG System**: Multi-directory document indexing with vector search
- **Privacy-First Design**: All processing happens locally, no external APIs


## RAG (Retrieval-Augmented Generation)

### Multiple Directory Support
- **Directory Limit**: Up to 3 document directories can be configured simultaneously
- **Automatic Migration**: Legacy single directory settings automatically upgraded
- **Unified Indexing**: All directories indexed together for comprehensive search
- **Directory Management**: Easy add/remove interface with visual directory listing

### Complete File Processing Pipeline
```typescript
// All supported formats with full content extraction
const supportedFormats = [
  '.txt', '.md', '.json', '.csv', '.mmd',     // Text formats (full content indexing)
  '.pdf',                                      // PDF with page-by-page text extraction
  '.doc', '.docx',                            // Word documents (complete text extraction)
  '.xls', '.xlsx',                            // Excel spreadsheets (sheet data as CSV)
  '.ppt', '.pptx',                            // PowerPoint presentations (basic support)
  '.eml', '.msg',                             // Email formats (headers + body parsing)
  '.png', '.jpg', '.jpeg', '.gif', '.webp'    // Images for vision models
];
```

### Advanced Document Processing Features
- **✅ Full Text Extraction**: All document formats now extract actual content (no placeholders)
- **PDF Processing**: Complete page-by-page text extraction using pdf2json library
- **Word Documents**: Full text extraction from both .docx (mammoth) and legacy .doc (word-extractor)
- **Excel Spreadsheets**: Sheet-by-sheet data extraction with proper CSV formatting and sheet names
- **Email Processing**: Complete header and body extraction for both .eml and .msg (Outlook) files
- **Text Files**: Enhanced formatting for .md (Markdown), .txt, .csv, .json, and .mmd (Mermaid) files
- **Intelligent Chunking**: Content split into searchable chunks by paragraphs with minimum length filtering
- **Error Handling**: Graceful fallbacks with informative error messages for processing failures

### RAG Performance Improvements
- **Efficient Processing**: Text-based files read once as UTF-8, complex files use specialized extractors
- **No Double Processing**: Eliminated redundant file reading for binary formats
- **Proper Content Labeling**: Each file type gets appropriate headers in indexed content
- **Enhanced Search Quality**: Real document content improves search relevance significantly

### Configurable Sensitivity
- **Sensitivity Range**: 10-100% threshold for document relevance (default 70%)
- **Dynamic Filtering**: Higher sensitivity requires better document matches
- **User Control**: Slider interface for real-time sensitivity adjustment
- **Quality Assurance**: Prevents low-quality document matches from affecting responses

## Model Support & Integration

### Ollama Integration
- **Auto-installation**: Default model (qwen3:4b) installed automatically
- **Model Validation**: Saved model selection validated on startup
- **Capability Detection**: Automatic detection of thinking and vision support
- **Streaming Responses**: Real-time response generation with thinking display and proper buffering

### Thinking Models
Supported models with thinking capabilities:
- qwen3:* (recommended default)
- deepseek-*
- r1-*
- o1-*
- intuitive-thinker-*
- chain-of-thought-*

### Vision Models
Supported models with image processing:
- llava-* (LLaVA multimodal models)
- minicpm-* (MiniCPM vision models)
- moondream-* (Moondream vision models)
- bakllava-* (BakLLaVA models)
- qwen2-vl-* / qwen2.5-vision-* (Qwen vision-language models)
- qwen-vl-* (Qwen VL models)
- gemma2-vision-* / gemma-vision-* (Gemma vision models)
- pixtral-* (Pixtral multimodal models)
- internvl-* (InternVL models)
- cogvlm-* (CogVLM models)
- *vision* / *visual* (Any model with "vision" or "visual" in the name)

## Development & Testing

### Build System
- **Development**: `npm run dev` - Hot reload with Vite and streaming support
- **Production**: `npm run build` - TypeScript compilation and packaging
- **Testing**: `npm test` - Jest with React Testing Library

### Code Quality
- **TypeScript**: Strict type checking enabled with proper streaming types
- **ESLint**: Code quality and consistency
- **Testing**: Component and service unit tests

## Current Implementation Status

### ✅ Completed Features (Latest Updates)

#### File Processing Enhancement
- **Complete Format Support**: All 15+ requested file formats now fully supported
- **PDF Text Extraction**: Full page-by-page text extraction using PDF.js
- **Word Document Processing**: Both legacy .doc and modern .docx with proper text extraction
- **Excel Data Processing**: Sheet-by-sheet data extraction with CSV formatting
- **Email Parsing**: Complete .eml and .msg email processing with headers and content
- **PowerPoint Support**: Basic .pptx support with enhanced compatibility messaging
- **Error Handling**: Comprehensive error handling with helpful conversion suggestions

#### Streaming Implementation Restoration
- **Real-Time Streaming**: Restored proper streaming functionality in service architecture
- **Buffer Management**: Proper chunk processing and accumulation
- **Error Handling**: Comprehensive error handling with user feedback
- **Progress Updates**: Real-time streaming progress with thinking support
- **IPC Communication**: Enhanced IPC messaging for streaming responses

#### Core System Features
- **Settings Persistence**: Automatic save on any change with file system storage
- **Conversation Persistence**: Complete chat history saved automatically between sessions
- **AI-Powered Chat Naming**: Intelligent titles generated and updated after every message
- **Individual Chat Deletion**: Delete specific conversations with confirmation prompts
- **Bulk Chat Management**: "Clear All Chats" option for complete conversation cleanup
- **File Explorer Integration**: Click RAG sources to open files in system Finder/Explorer
- **Historical Content Preservation**: Thinking and RAG sources always visible regardless of current settings
- **Enhanced UI Branding**: 25% larger Icarus logo and title with adaptive sidebar visibility
- **Multiple RAG Directories**: Support for up to 3 document directories with persistence
- **Configurable RAG Sensitivity**: User-controlled document relevance thresholds
- **Model Configuration**: Temperature, context length, topP, topK, repeat penalty sliders

### 🔄 Recent Major Enhancements (Current Session)

#### Intelligent Document Writing Mode Enhancement
- **✅ Document Type Detection**: AI automatically identifies requests for technical designs, PRFAQs, business plans, and research reports
- **Information Sufficiency Analysis**: Evaluates whether enough context exists for comprehensive document creation
- **Two-Path Response System**: Different workflows for insufficient vs. sufficient information scenarios
- **Structured Information Gathering**: Targeted clarifying questions about requirements, scope, objectives, and constraints
- **Visual Status Indicators**: Document type badges, information needed cards, summary displays, and readiness indicators
- **Interactive Workflow**: Action buttons for proceeding with document creation or providing additional information
- **Enhanced Settings Panel**: Improved description and visual design for document writing mode toggle
- **Confirmation System**: Clear summary and approval step before document generation begins

#### RAG File Processing Complete Overhaul
- **✅ Eliminated Placeholders**: All file formats now extract actual content instead of placeholder messages
- **Full PDF Text Extraction**: Complete page-by-page text extraction using pdf2json with proper content chunking
- **Complete Word Processing**: Both .docx (mammoth) and legacy .doc (word-extractor) with full text extraction
- **Excel Data Processing**: Sheet-by-sheet extraction with CSV formatting and proper sheet identification
- **Email Content Extraction**: Full .eml and .msg processing with headers, body, and metadata parsing
- **Enhanced Text File Processing**: Improved formatting for .md, .txt, .csv, .json, and .mmd files with proper labeling
- **Optimized Processing Pipeline**: Separated text-based files (UTF-8 reading) from complex files (specialized extractors)
- **Error Recovery**: Comprehensive error handling with graceful fallbacks and informative error messages

#### Model Capability Display Enhancement
- **Visual Capability Badges**: Added "Thinking" and "Vision" badges next to model names in chat header
- **Real-time Capability Detection**: Automatic detection of model capabilities based on name patterns and model info
- **Consistent Visual Design**: Color-coded badges with app theme integration (blue for thinking, purple for vision)
- **ModelSelector Enhancement**: Capability indicators in dropdown showing T/V badges for quick model selection
- **Store Integration**: Enhanced state management for model capabilities with persistent storage

#### Message Queue System Implementation
- **Concurrent Message Submission**: Users can now type and submit new messages while the LLM is processing previous requests
- **Intelligent Queue Management**: Messages are automatically queued when the system is busy and processed sequentially
- **Visual Queue Indicators**: Real-time display of queued messages with count and preview
- **Enhanced User Experience**: Input field remains active during processing, showing helpful placeholder text
- **Seamless Processing**: Queue automatically processes next message when current response completes

#### Conversation Management Enhancement
- **Truly Blank New Chats**: New Chat button now completely clears all UI state including input text, attachments, streaming states, RAG sources, and document context
- **Complete State Reset**: Ensures fresh conversation start with no residual data from previous chats
- **Enhanced User Experience**: Provides clean slate for new conversations without UI interference

#### RAG Sources Interactive Display
- **Restored RAG Sources**: RAG document sources now properly display in assistant messages
- **Clickable Integration**: RAG sources are fully clickable with file explorer integration
- **Interface Alignment**: Fixed data structure mismatches between backend and frontend components
- **Error Handling**: Robust error handling for file access and display operations

#### File Format Support Extension
- **Legacy Format Support**: Added full support for .doc and .msg files
- **Advanced Parsing**: Implemented word-extractor for .doc files and @kenjiuno/msgreader for .msg files
- **Complete Pipeline**: All requested file formats now have full text extraction capabilities
- **Integration**: Seamlessly integrated into existing RAG pipeline

#### Streaming Functionality Restoration
- **Issue Identification**: Discovered streaming was broken during service architecture refactoring
- **Implementation Fix**: Enhanced main.ts to properly handle real-time streaming responses
- **Buffer Management**: Added proper chunk processing and response accumulation
- **Error Handling**: Comprehensive streaming error handling with user feedback
- **Testing**: Verified streaming functionality works with service-based architecture

#### Enhanced RAG Index Clearing
- **Comprehensive Clearing**: RAG clearing now removes ALL document references and cached data
- **Full State Reset**: Clears in-memory database, UI state, settings, and cached references
- **Complete Cache Removal**: Eliminates live RAG sources, matching documents, and search state
- **Settings Reset**: Resets RAG directories, sensitivity, and disables RAG functionality
- **Historical References**: Provides clear feedback about existing message RAG sources that become non-functional

#### Model Installation Enhancement
- **Complete Implementation**: Connected SettingsPanel model installation to backend functionality
- **Real-Time Progress**: Live progress updates with download percentage, speed, and status
- **Success/Failure Feedback**: Clear visual indicators with green checkmarks for success, red X for failures
- **Enhanced Status Display**: Color-coded status messages with appropriate icons and styling
- **Automatic Model Refresh**: Model list automatically updates after successful installation
- **Input Validation**: Prevents empty model names and provides helpful error messages

### 📝 Configuration Files
- `package.json`: Dependencies including new file parsing libraries
- `tsconfig.json`: TypeScript configuration with streaming support
- `vite.config.ts`: Build configuration
- `electron/main.ts`: Enhanced main process with streaming and service architecture
- Settings automatically saved to userData directory

## 🎯 User Experience Enhancements

### Automatic Settings Persistence
All user preferences are saved immediately when changed:
- Model selection persists across sessions
- RAG settings and directory preferences maintained
- UI state (thinking, turn-based mode) remembered
- No manual save required - changes are instant

### Interactive RAG Sources
- **Dual-Button Interface**: Separate buttons for file explorer (📁) and content viewer (👁️)
- **File Explorer Integration**: Opens file location in system Finder/Explorer/File Manager
- **Content Viewer Modal**: Full file content display with syntax highlighting and "Add to Chat" functionality
- **Historical Preservation**: RAG sources remain clickable in chat history even when RAG is disabled
- **Enhanced Tooltips**: Rich hover previews with file path and content excerpts

### Real-Time Streaming Experience
- **Live Response Display**: Text appears character by character in real-time
- **Thinking Transparency**: Model reasoning shown during streaming
- **Progress Indicators**: Visual feedback during response generation
- **Error Recovery**: Graceful handling of streaming interruptions
- **Buffer Management**: Smooth text flow without stuttering or delays

### File Processing Experience
- **Drag & Drop Support**: Easy file attachment with visual feedback
- **Format Recognition**: Automatic file type detection and appropriate processing
- **Progress Feedback**: Visual indicators during file processing
- **Error Messages**: Clear feedback for unsupported formats or processing errors
- **Size Limits**: Appropriate limits with helpful guidance (10MB for images)

### Advanced Model Configuration
- **Custom System Prompts**: Define AI personality and behavior with persistent custom prompts
  - Applied to every conversation automatically
  - Rich textarea interface with helpful guidance
  - Optional setting - leave empty for default behavior
  - Examples: roleplay characters, professional consultants, creative assistants
  - Seamlessly integrates with chat flow for consistent AI behavior
- **Model Parameter Controls**: Fine-tune AI responses with intuitive sliders
  - **Temperature**: Creativity vs. focus (0.0-1.0, default 0.7)
  - **Context Length**: Memory window (512-8192 tokens, default 2048)
  - **Top-P**: Nucleus sampling for response diversity (0.1-1.0, default 0.9)
  - **Top-K**: Vocabulary limiting for consistency (1-100, default 40)
  - **Repeat Penalty**: Reduce repetitive responses (0.5-2.0, default 1.1)
  - **Reset to Defaults**: One-click restoration of optimal settings with instant application

## Memory & Context

This documentation serves as the complete memory for Icarus development. The application now features:

### Automatic Persistence
- **Settings**: All user preferences automatically saved and restored
- **Conversations**: Complete chat history with AI-generated titles preserved between sessions
- **RAG Configuration**: Document directories and sensitivity settings maintained
- **Model Selection**: Current model and parameters remembered
- **UI State**: Sidebar visibility, thinking mode, and document mode preferences

### Data Locations
- **Settings**: `userData/helios-settings.json`
- **Conversations**: `userData/helios-conversations.json`
- **RAG Index**: In-memory with automatic re-indexing

### Current Capabilities Summary
The application maintains full context of:
1. **User Conversations**: Every chat with intelligent AI-generated titles and streaming responses
2. **Document Sources**: RAG directories with comprehensive file format support and file explorer integration
3. **Model Preferences**: Selected models with custom parameter configurations and streaming capabilities
4. **UI Customizations**: Theme, layout, and feature toggles with real-time updates
5. **File Interactions**: Complete file processing pipeline with 15+ supported formats

### Technical Implementation Status
- **Streaming**: ✅ Fully functional real-time streaming with proper buffer management
- **File Processing**: ✅ Complete support for all requested formats (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, EML, MSG, MMD, CSV, TXT, MD, JSON, Images)
- **RAG Integration**: ✅ Multi-directory support with configurable sensitivity
- **Message Queue System**: ✅ Full concurrent message processing with queue management
- **Error Handling**: ✅ Comprehensive error handling across all components
- **Performance**: ✅ Optimized for real-time streaming and file processing

No manual configuration is required on startup - all user preferences, conversation history, RAG configurations, and streaming functionality are automatically restored exactly as they were left.

## Message Queue System Architecture

### Queue Implementation Details
```typescript
interface QueuedMessage {
  id: string;
  content: string;
  attachments: FileAttachment[];
  timestamp: Date;
}

// State management
const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);
```

### Queue Processing Flow
1. **Message Submission**: When user submits while LLM is busy, message is added to queue
2. **Immediate Processing**: If system is idle, message processes immediately
3. **Sequential Processing**: Queue processes messages one at a time in FIFO order
4. **Automatic Continuation**: When response completes, next queued message processes automatically
5. **Visual Feedback**: Real-time queue display with message previews and counts

### User Experience Features
- **Always-Active Input**: Input field never disabled during processing
- **Smart Placeholders**: Context-aware placeholder text indicates queue behavior
- **Queue Visualization**: Compact display showing up to 3 queued messages
- **Attachment Preservation**: File attachments maintained through queue process
- **Status Indicators**: Button shows queue count when processing

## Development & Technical Details

> **🔧 For comprehensive technical documentation, build instructions, and development setup, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

### Recent Major Improvements
- **Complete RAG File Processing**: All 15+ file formats now extract actual content instead of placeholders
- **Intelligent Document Writing**: Advanced document creation workflow with clarifying questions
- **Model Capability Detection**: Visual badges for thinking and vision model capabilities
- **Enhanced Streaming**: Robust real-time chat streaming with proper error handling
- **Message Queue System**: Concurrent message submission with intelligent queue management

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Electron with service-based IPC architecture
- **File Processing**: Specialized libraries for PDF, Office docs, and email formats
- **AI Integration**: Direct Ollama API with streaming support
- **Storage**: Local JSON persistence for privacy and performance