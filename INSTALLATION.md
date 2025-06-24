# Icarus Installation Guide

Welcome to **Icarus** - your powerful desktop AI assistant for private, local conversations with advanced document processing capabilities!

## 🚀 Quick Start

### System Requirements

**Minimum Requirements:**
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 8GB (16GB recommended for larger models)
- **Storage**: 5GB free space (plus space for AI models)
- **Internet**: Required only for initial model downloads

**Recommended:**
- 16GB+ RAM for optimal performance with larger models
- SSD storage for faster model loading
- Modern CPU (Intel i5/AMD Ryzen 5 or better)

### Installation

#### Windows
1. **Download** the latest `Icarus-Setup.exe` from the [releases page](https://github.com/MattJColes/icarus/releases)
2. **Run** the installer and follow the setup wizard
3. **Launch** Icarus from your Start Menu or Desktop shortcut

#### macOS
1. **Download** the latest `Icarus.dmg` from the [releases page](https://github.com/MattJColes/icarus/releases)
2. **Open** the DMG file and drag Icarus to your Applications folder
3. **Launch** Icarus from Applications (you may need to allow it in System Preferences → Security & Privacy)

#### Linux
1. **Download** the latest `Icarus.AppImage` from the [releases page](https://github.com/MattJColes/icarus/releases)
2. **Make executable**: `chmod +x Icarus.AppImage`
3. **Run**: `./Icarus.AppImage`

Alternative: Use the `.deb` package for Ubuntu/Debian systems

## 🤖 First Launch Setup

### Automatic Ollama Installation

On first launch, Icarus will:
1. **Check for Ollama** - If not found, it will offer to install it automatically
2. **Download Default Model** - Installs the recommended `qwen3:4b` model
3. **Setup Complete** - You're ready to start chatting!

**Manual Ollama Installation (if needed):**
- Visit [ollama.ai](https://ollama.ai/) to download and install manually
- Restart Icarus after installation

### Step 1: Install Your First AI Model

The application automatically installs `qwen3:4b` which provides:
- ✅ **Thinking transparency** - See the AI's reasoning process
- ✅ **High-quality responses** - Balanced performance and speed
- ✅ **Moderate resource usage** - Works well on most computers

**Popular Models to Try:**
- `llama3.2:3b` - Faster, lighter model (4GB RAM minimum)
- `deepseek-r1:7b` - Enhanced reasoning capabilities (12GB RAM)
- `llava:7b` - Vision model for image processing (12GB RAM)
- `qwen2.5-vision:7b` - Advanced vision-language model (12GB RAM)
- `minicpm-v:8b` - Efficient multimodal model (12GB RAM)

### Step 2: Configure Your Preferences

Access the **Settings Panel** (⚙️ icon) to customize:

#### **Model Parameters**
- **Temperature** (0.0-1.0): Controls creativity vs. focus (default: 0.7)
- **Context Length** (512-8192): How much conversation history to remember (default: 2048)
- **Advanced Controls**: Fine-tune Top-P, Top-K, and repeat penalty

#### **System Prompt** (Optional)
Create a custom AI personality by defining a system prompt:
```
You are a helpful coding assistant specialized in JavaScript and React.
Always provide working code examples and explain your reasoning.
```

## 📚 Document Processing (RAG)

### Setting Up Document Search

1. **Enable RAG** in Settings
2. **Add Document Directories** (up to 3 folders)
3. **Adjust Sensitivity** (10-100%) to control search precision
4. **Wait for Indexing** - Icarus will process all your documents

### Supported File Formats

**📄 Text & Documents:**
- `.txt` - Plain text files
- `.md` - Markdown documents  
- `.json` - JSON data files
- `.csv` - Spreadsheet data
- `.mmd` - Mermaid diagrams

**📊 Office Documents:**
- `.pdf` - PDF documents (full text extraction)
- `.docx` / `.doc` - Microsoft Word documents
- `.xlsx` / `.xls` - Excel spreadsheets (all sheets)
- `.pptx` / `.ppt` - PowerPoint presentations

**📧 Email:**
- `.eml` - Standard email files
- `.msg` - Outlook message files

**🖼️ Images:** (For vision models)
- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

### How RAG Works

When RAG is enabled, Icarus automatically:
1. **Searches** your documents for relevant content
2. **Includes** matching sections in the conversation context
3. **Shows** source files you can click to open
4. **Updates** search results as you chat

## 💬 Using Icarus

### Basic Chat Features

- **Real-time Streaming**: Responses appear as they're generated
- **Thinking Mode**: Toggle to see AI reasoning process with structured ReAct framework
- **Message Queue**: Type new messages while AI is responding
- **File Attachments**: Drag & drop files directly into chat

### Advanced Features

#### **Intelligent Document Writing Mode**
Advanced document creation with smart assistance:

**What it does:**
- Automatically detects requests for structured documents (technical designs, PRFAQs, business plans, research reports)
- Intelligently assesses if you've provided enough information for comprehensive document creation
- Asks targeted clarifying questions when more details are needed
- Provides clear confirmation workflow before beginning document generation

**How to use:**
1. **Enable in Settings**: Toggle "Intelligent Document Writing Mode"
2. **Request a Document**: Ask for technical designs, PRFAQs, business plans, etc.
3. **AI Analysis**: System automatically evaluates your request
4. **Two Possible Paths**:
   - **Need More Info**: AI asks clarifying questions about requirements, scope, objectives
   - **Ready to Proceed**: AI summarizes understanding and asks for confirmation
5. **Interactive Workflow**: Click questions to answer them, or use action buttons to proceed

**Visual Indicators:**
- 📄 **Document Type Badge**: Shows what type of document was detected
- ℹ️ **Information Needed**: Blue cards listing required details
- 📝 **Information Summary**: Green summary of current understanding  
- ✅/⏳ **Ready Status**: Visual indicator of readiness to proceed
- **Action Buttons**: "Proceed with Document" or "Provide More Info"

#### **Enhanced Thinking Mode (ReAct Framework)**
When thinking mode is enabled, see the AI's structured reasoning process:
- 🤔 **Thought**: The AI's analysis and reasoning
- ⚡ **Action**: What approach it's taking
- 👁️ **Observation**: Key insights and considerations

#### **Interactive RAG Sources**
When RAG finds relevant documents:
- 📁 **File Explorer Button**: Opens file location on your computer
- 👁️ **Content Viewer**: Shows file content with "Add to Chat" option

#### **Conversation Management**
- **Auto-naming**: AI generates intelligent titles for each chat
- **Persistent History**: All conversations saved automatically
- **Individual Deletion**: Remove specific chats
- **Blank New Chats**: Fresh conversations with clean state

## 🎨 Interface Overview

### Sidebar
- **New Chat**: Start fresh conversations
- **Chat History**: Access previous conversations
- **Settings**: Configure models and preferences

### Main Chat Area
- **Message Input**: Type messages and attach files
- **Streaming Responses**: Live AI responses with thinking
- **RAG Sources**: Clickable document references
- **Queue Status**: See pending messages when AI is busy
- **Model Capability Badges**: Visual indicators showing current model's abilities

### Chat Header
- **Model Name**: Current AI model with status indicator (green dot = connected)
- **🧠 Thinking Badge**: Shows for models with reasoning capabilities (qwen3, deepseek-r1, etc.)
- **🖼️ Vision Badge**: Shows for models with image processing (llava, minicpm, etc.)
- **📚 RAG Badge**: Shows when document search is enabled

### Settings Panel
- **Model Selection**: Choose and install AI models with capability indicators
- **RAG Configuration**: Set up document search
- **UI Preferences**: Customize interface behavior including document writing mode
- **Advanced Parameters**: Fine-tune model behavior

## 🔧 Troubleshooting

### Common Issues

**Application Won't Start**
- Check system requirements are met
- Try running as administrator (Windows) or with elevated permissions
- Check antivirus software isn't blocking the application

**Ollama Not Connected**
- Restart Icarus - it will attempt to install Ollama automatically
- If manual installation needed, visit [ollama.ai](https://ollama.ai/)
- Check if models are downloaded using Ollama's interface

**File Processing Errors**
- Check file permissions in RAG directories
- Some PDF files may have processing limitations
- Try converting problematic files to supported formats

**Performance Issues**
- Reduce context length for faster responses
- Use smaller models for better performance
- Ensure adequate RAM for your selected model
- Close other resource-intensive applications

### Getting Help

- Check the application's built-in logs for detailed error messages
- Verify all file formats are supported before adding to RAG
- Ensure adequate disk space for model downloads
- Visit our [GitHub repository](https://github.com/MattJColes/icarus) for community support

## 🔒 Privacy & Security

Icarus is designed with privacy in mind:
- ✅ **100% Local Processing** - No data sent to external servers
- ✅ **Private Conversations** - All chats stored locally on your device
- ✅ **Document Security** - Your files never leave your computer
- ✅ **No Telemetry** - No usage tracking or data collection
- ✅ **Open Source** - Transparent, auditable code

## 🚀 Tips for Best Results

### Model Selection
- **qwen3** series: Best for thinking and reasoning tasks
- **llama3.2**: Fast and efficient for general use  
- **deepseek-r1**: Enhanced problem-solving capabilities
- **llava/minicpm**: When you need image processing

### RAG Optimization
- **Organize Documents**: Create focused directories by topic
- **Use Descriptive Filenames**: Helps with search relevance
- **Adjust Sensitivity**: Lower for broader search, higher for precise matches
- **Regular Indexing**: Re-index when adding many new documents

### Chat Strategies
- **Be Specific**: Clear questions get better answers
- **Use Context**: Reference previous messages and attached files
- **Leverage Thinking**: Enable thinking mode for complex problems
- **Attach Relevant Files**: Include context documents in your messages

## 🎯 Next Steps

Once you're set up:
1. **Explore Models**: Try different AI models for various tasks
2. **Build Document Library**: Add your important documents to RAG
3. **Customize Experience**: Adjust settings to match your workflow
4. **Advanced Usage**: Experiment with system prompts and parameters

Welcome to the future of private, intelligent assistance! 🚀

---

*For technical documentation and advanced configuration, see CLAUDE.md in the application directory.*