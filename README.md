# Helios - Desktop AI Assistant

A powerful, privacy-focused desktop AI assistant built with Electron, React, and TypeScript. Helios provides seamless integration with local LLMs via Ollama, featuring advanced RAG capabilities, thinking transparency, and intelligent document processing.

![Helios Interface](docs/screenshots/main-interface.png)

## ✨ Key Features

- **🔒 Privacy-First**: All processing happens locally with Ollama
- **📚 Advanced RAG**: Multi-directory document indexing with configurable sensitivity
- **💭 Thinking Transparency**: Real-time display of model reasoning process
- **📝 Document Writing Mode**: Amazon-style document creation with structured output
- **🎨 Beautiful UI**: Custom maroon-purple theme with responsive design
- **⚙️ Model Configuration**: Fine-tune temperature, context length, and other parameters
- **🔄 Auto-Sync**: Persistent settings and automatic document indexing
- **💬 Conversation Persistence**: Chat history saved automatically between sessions
- **🤖 AI-Powered Chat Naming**: Intelligent titles generated for every conversation
- **📁 File Explorer Integration**: Click RAG sources to open files in system explorer
- **🗑️ Chat Management**: Individual conversation deletion and bulk clear options
- **📄 Multi-Format File Support**: Drag & drop support for images, documents, and text files

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** - Download from [ollama.ai](https://ollama.ai)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd helios
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Ollama**
   ```bash
   # Install and start Ollama service
   ollama serve
   ```

4. **Run Helios**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Or build and run production
   npm run build
   npm start
   ```

### First Launch

1. **Automatic Model Installation**: Helios will automatically install `qwen3:4b` as the default model
2. **Configure RAG** (Optional): Go to Settings → RAG to add up to 3 document directories
3. **Adjust Model Parameters**: Fine-tune temperature, context length, and other settings
4. **Start Chatting**: Begin conversations with your local AI assistant

## 📖 Usage Guide

### Basic Chat
- Type messages in the input field and press Enter
- Toggle "Show thinking" to see the model's reasoning process
- Attach files by dragging them into the chat area
- **Chat Titles**: Every conversation gets an AI-generated title that updates with each message
- **Conversation Management**: Click the "×" button to delete individual chats
- **Persistent History**: All conversations are automatically saved and restored between sessions

### RAG (Document Search)
1. **Add Directories**: Settings → RAG → Add Directory (up to 3)
2. **Adjust Sensitivity**: Use the slider to control document relevance (10-100%)
3. **Enable RAG**: Check the RAG box in the chat interface
4. **Ask Questions**: Helios will automatically search your documents for relevant context
5. **Source Navigation**: 
   - Click **📁** button to open files in system file explorer/Finder
   - Click **👁️** button to view file content within Helios
   - Historical RAG sources remain visible even when RAG is disabled

### Document Mode
1. **Enable Document Writing Mode**: Check "📝 Document mode (Amazon-style)"
2. **Start New Document**: Enter a title when prompted
3. **Build Sections**: Each Q&A pair becomes a document section
4. **Export**: Copy the complete markdown document to clipboard

### Settings & Management
#### Model Configuration
- **Temperature**: Controls creativity (0 = focused, 1 = creative)
- **Context Length**: Maximum tokens the model can process
- **Top P/K**: Advanced sampling parameters for response generation
- **Repeat Penalty**: Reduces repetitive text generation

#### Chat Features
- **Show Thinking**: Display model reasoning process (preserved in chat history)
- **Document Writing Mode**: Amazon-style structured document creation
- **Clear All Chats**: Bulk delete all conversations (Settings → Chat Features)

#### File Handling
- **Drag & Drop**: Supports images, text files, documents, PDFs, Excel, PowerPoint
- **Vision Models**: Automatic image processing with compatible models (llava, minicpm, etc.)
- **File Viewer**: Built-in content viewer with "Add to Chat" functionality

## 🛠️ Development

### Project Structure
```
helios/
├── src/                    # React frontend
│   ├── App-full.tsx       # Main application component
│   └── components/        # UI components
├── electron/              # Electron main process
│   ├── main.ts     # Core application logic
│   └── preload.js         # IPC bridge
├── docs/                  # Documentation
└── dist/                  # Built application
```

### Available Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run dev:renderer     # Frontend only (for UI development)

# Building
npm run build           # Full build + package
npm run package         # Package for distribution
npm run make           # Create installers

# Testing & Quality
npm test               # Run test suite
npm run test:watch     # Watch mode testing
npm run lint           # ESLint code checking
npm run typecheck      # TypeScript type checking
```

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Electron, Node.js
- **AI Integration**: Ollama API
- **Build Tools**: Vite, Electron Forge
- **Testing**: Jest, React Testing Library

## 📋 Requirements

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB for application + model storage
- **Network**: Internet connection for initial model download

### Ollama Models
Helios supports any Ollama-compatible model:

**Recommended Models**:
- `qwen3:4b` (Default - balanced performance)
- `llama3.2:8b` (Meta's latest)
- `deepseek-coder:6.7b` (Code-focused)
- `llava:7b` (Vision capabilities)

**Thinking Models** (show reasoning):
- `qwen3:*`, `deepseek-*`, `r1-*`

## ⚙️ Configuration

### Data Storage Locations
#### Settings
- **macOS**: `~/Library/Application Support/helios/helios-settings.json`
- **Windows**: `%APPDATA%/helios/helios-settings.json`
- **Linux**: `~/.config/helios/helios-settings.json`

#### Conversations
- **macOS**: `~/Library/Application Support/helios/helios-conversations.json`
- **Windows**: `%APPDATA%/helios/helios-conversations.json`
- **Linux**: `~/.config/helios/helios-conversations.json`

All data is stored locally and never transmitted to external servers.

### Supported File Formats
#### RAG Document Indexing
- **Text**: `.md`, `.txt`
- **Data**: `.json`, `.csv`
- **Future**: `.pdf`, `.docx` (planned)

#### File Attachments (Drag & Drop)
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` (up to 10MB)
- **Text**: `.txt`, `.md`, `.json`, `.csv`
- **Documents**: `.pdf`, `.docx`, `.xlsx`, `.pptx` (placeholder processing)
- **Email**: `.eml`, `.msg` (placeholder processing)

### Model Parameters
```json
{
  "temperature": 0.7,        // 0-1, creativity level
  "contextLength": 40000,     // 2048-1M, max tokens
  "topP": 0.9,              // 0.1-1.0, nucleus sampling
  "topK": 40,               // 1-100, top-k sampling
  "repeatPenalty": 1.1      // 0.5-2.0, repetition control
}
```

## 🐛 Troubleshooting

### Common Issues

**Ollama Connection Failed**
```bash
# Check if Ollama is running
ollama list

# Start Ollama service
ollama serve
```

**Model Download Stuck**
```bash
# Manually install default model
ollama pull qwen3:4b
```

**RAG Indexing Failed**
- Ensure document directories exist and are readable
- Check file permissions
- Verify supported file formats (.md, .txt, .json, .csv)

**Settings Not Persisting**
- Check write permissions to settings directory
- Restart application after major version updates

**Chat History Lost**
- Verify conversation file exists in userData directory
- Check file permissions for `helios-conversations.json`
- Conversations auto-save after each message

**RAG Sources Not Clickable**
- Ensure files still exist at original locations
- Check directory permissions for file explorer access
- Use 👁️ button if 📁 button fails to open explorer

### Performance Tips
- **Large Document Collections**: Use higher RAG sensitivity (80-100%)
- **Slow Responses**: Reduce context length or use smaller models
- **Memory Issues**: Use "Clear All Chats" to free memory, restart application
- **Chat Title Generation**: Happens automatically in background without affecting performance
- **File Attachments**: Keep image files under 10MB for optimal processing

## 🤝 Contributing

We welcome contributions! Please see [TECH.md](TECH.md) for technical details and development guidelines.

### Quick Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team** - For the excellent local LLM runtime
- **React & Electron** - For the powerful development frameworks
- **Open Source Community** - For the amazing tools and libraries

---

**Need Help?** 
- 📖 Read [TECH.md](TECH.md) for technical details
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

**Helios - Your Privacy-Focused AI Companion** 🌟