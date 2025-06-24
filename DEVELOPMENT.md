# Helios Development Guide

## Overview

Helios is a desktop AI assistant built with Electron, React, and TypeScript. This guide covers development setup, running the project, and building executables for all platforms.

## Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **npm** (v9 or higher) 
- **Git**
- **Ollama** (for AI model support)

### Platform-Specific Requirements

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **macOS 10.15** or higher

#### Windows
- **Visual Studio Build Tools** or **Visual Studio Community**
- **Windows 10** or higher
- **PowerShell** (for script execution)

#### Linux
- **build-essential**: `sudo apt-get install build-essential`
- **libnss3-dev**: `sudo apt-get install libnss3-dev`
- **libatk-bridge2.0-dev**: `sudo apt-get install libatk-bridge2.0-dev`
- **libdrm2**: `sudo apt-get install libdrm2`
- **libxcomposite1**: `sudo apt-get install libxcomposite1`
- **libxdamage1**: `sudo apt-get install libxdamage1`
- **libxrandr2**: `sudo apt-get install libxrandr2`
- **libgbm1**: `sudo apt-get install libgbm1`
- **libxss1**: `sudo apt-get install libxss1`
- **libasound2**: `sudo apt-get install libasound2`

## Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd helios
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Ollama
Visit [ollama.ai](https://ollama.ai) and install Ollama for your platform:

#### macOS/Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows
Download and run the installer from the Ollama website.

### 4. Start Ollama Service
```bash
ollama serve
```

### 5. Install a Default Model (Optional)
```bash
ollama pull qwen3:4b
```

## Development

### Running in Development Mode

#### Start Development Server
```bash
npm run dev
```

This command:
- Starts the Vite development server on `http://localhost:5173`
- Launches the Electron app with hot reload
- Opens developer tools automatically
- Enables real-time code changes

#### Development Features
- **Hot Reload**: Changes to React components update instantly
- **DevTools**: Electron and browser developer tools available
- **Live Debugging**: Console logs and error tracking
- **Source Maps**: Full TypeScript debugging support

### Project Structure
```
helios/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Service layer (IPC, Ollama, etc.)
│   └── App-full.tsx       # Main application component
├── electron/              # Electron main process
│   ├── main.ts           # Service-based main process
│   └── preload.ts        # Preload script for IPC
├── public/               # Static assets
└── dist/                 # Built application files
```

### Key Files
- **`src/App-full.tsx`**: Main React application with full feature set
- **`electron/main.ts`**: Electron main process (currently active)
- **`src/hooks/useFileHandling.ts`**: File processing and RAG integration
- **`src/components/SettingsPanel.tsx`**: Application settings interface
- **`forge.config.js`**: Electron Forge build configuration

## Building Executables

### Build Configuration
The project uses **Electron Forge** for building and packaging. Configuration is in `forge.config.js`.

### Build Commands

#### Development Build (All Platforms)
```bash
npm run build
```
Creates development builds in the `out/` directory.

#### Production Packaging

##### Package for Current Platform
```bash
npm run package
```

##### Make Distributables for Current Platform
```bash
npm run make
```

### Platform-Specific Builds

#### macOS

##### Build on macOS
```bash
# Development
npm run build

# Package
npm run package

# Create distributable (.dmg, .app)
npm run make
```

**Output Files:**
- `out/Helios-darwin-x64/Helios.app` - macOS Application Bundle
- `out/make/zip/darwin/x64/Helios-darwin-x64-1.0.0.zip` - Zipped Application

##### Cross-compile from other platforms
```bash
# Install macOS build tools (on Linux/Windows)
npm install --save-dev @electron-forge/maker-dmg

# Build for macOS
npx electron-forge package --platform=darwin --arch=x64
```

#### Windows

##### Build on Windows
```bash
# Development
npm run build

# Package
npm run package

# Create distributable (.exe installer)
npm run make
```

**Output Files:**
- `out/Helios-win32-x64/Helios.exe` - Windows Executable
- `out/make/squirrel.windows/x64/HeliosSetup.exe` - Windows Installer

##### Cross-compile from other platforms
```bash
# Install Windows build tools (on macOS/Linux)
npm install --save-dev @electron-forge/maker-squirrel

# Build for Windows
npx electron-forge package --platform=win32 --arch=x64
```

#### Linux

##### Build on Linux
```bash
# Development
npm run build

# Package
npm run package

# Create distributable (.deb, .rpm)
npm run make
```

**Output Files:**
- `out/Helios-linux-x64/helios` - Linux Executable
- `out/make/deb/x64/helios_1.0.0_amd64.deb` - Debian Package
- `out/make/rpm/x64/helios-1.0.0-1.x86_64.rpm` - RPM Package

##### Cross-compile from other platforms
```bash
# Install Linux build tools (on macOS/Windows)
npm install --save-dev @electron-forge/maker-deb @electron-forge/maker-rpm

# Build for Linux
npx electron-forge package --platform=linux --arch=x64
```

### Cross-Platform Building

#### All Platforms (requires setup on each)
```bash
# Build for all platforms (run on each respective OS)
npm run make -- --platform=darwin
npm run make -- --platform=win32  
npm run make -- --platform=linux
```

#### Using Docker (Linux builds)
```bash
# Build Linux version using Docker
docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CI_|BUILDKITE|HEROKU') \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ${PWD##*/}-node-modules:/project/node_modules \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && npm install && npm run make"
```

### Build Optimization

#### Reduce Bundle Size
```bash
# Analyze bundle size
npm run build -- --analyze

# Clean build
rm -rf dist/ out/ .vite/
npm run build
```

#### Performance Optimization
- **Code Splitting**: Automatically handled by Vite
- **Tree Shaking**: Dead code elimination enabled
- **Minification**: Production builds are minified
- **Asset Optimization**: Images and fonts optimized

## Testing

### Unit Tests
```bash
npm test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## Troubleshooting

### Common Issues

#### Build Failures

**Node.js Version Issues**
```bash
# Check Node version
node --version

# Use Node Version Manager
nvm install 18
nvm use 18
```

**Permission Issues (macOS/Linux)**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**Windows Build Tools**
```bash
# Install Windows build tools
npm install --global windows-build-tools
```

#### Electron Issues

**Electron Download Failed**
```bash
# Clear Electron cache
npm cache clean --force
rm -rf node_modules
npm install
```

**Code Signing (macOS)**
```bash
# For development, disable code signing
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run make
```

#### Ollama Connection Issues

**Service Not Running**
```bash
# Start Ollama service
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

**Port Conflicts**
```bash
# Check port usage
lsof -i :11434

# Kill conflicting process
kill -9 <PID>
```

### Development Tools

#### Debug Logging
Enable debug logging by setting environment variables:
```bash
# Enable Electron debug logs
export DEBUG=electron*
npm run dev

# Enable Vite debug logs  
export DEBUG=vite*
npm run dev
```

#### Performance Monitoring
```bash
# Enable performance monitoring
export NODE_ENV=development
export ELECTRON_ENABLE_LOGGING=true
npm run dev
```

## Deployment

### Automatic Updates
The application is configured for automatic updates using `electron-updater`:

```javascript
// In main process
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### Distribution

#### Code Signing

**macOS**
```bash
# Set up code signing
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
npm run make
```

**Windows**
```bash
# Set up code signing
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
npm run make
```

#### Release Process
1. Update version in `package.json`
2. Create git tag: `git tag v1.0.0`
3. Build for all platforms
4. Upload to distribution platform
5. Notify users of update

## Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test: `npm run dev`
3. Run tests: `npm test`
4. Build: `npm run build`
5. Commit changes: `git commit -m "Add new feature"`
6. Push branch: `git push origin feature/new-feature`
7. Create pull request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### Testing Requirements
- Unit tests for new components
- Integration tests for major features
- E2E tests for critical user flows
- Performance benchmarks for builds

## Architecture Notes

### Current Configuration
- **Main Process**: Uses `electron/main.ts` (stable, production-ready)
- **Renderer Process**: React with TypeScript
- **IPC Communication**: Custom handlers for file processing, RAG, and model management
- **File Processing**: Supports 15+ formats including PDF, Word, Excel, PowerPoint, Email
- **AI Integration**: Ollama for local LLM execution with streaming support

### Key Features Implemented
- ✅ Real-time streaming chat responses
- ✅ RAG document indexing with multiple directory support
- ✅ Comprehensive file format processing (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, EML, MSG, etc.)
- ✅ Model installation with progress tracking
- ✅ Settings persistence across sessions
- ✅ Conversation history with AI-generated titles
- ✅ Thinking transparency for supported models
- ✅ Responsive UI with collapsible sidebar

## Resources

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Forge Documentation](https://www.electronforge.io/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Ollama Documentation](https://ollama.ai/docs)

### Community
- [Electron Discord](https://discord.gg/electron)
- [Electron GitHub](https://github.com/electron/electron)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/electron)

### Tools
- [Electron Builder](https://www.electron.build/) - Alternative packaging tool
- [Spectron](https://www.electronjs.org/spectron) - E2E testing framework
- [Electron DevTools](https://github.com/sindresorhus/electron-debug) - Development utilities