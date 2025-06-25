# Icarus Development Guide

## Overview

Icarus (formerly Helios) is a desktop AI assistant built with Electron, React, and TypeScript. This guide covers development setup, running the project, and building executables for all platforms.

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
cd icarus
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
icarus/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Service layer (IPC, Ollama, etc.)
│   └── App-full.tsx       # Main application component
├── electron/              # Electron main process
│   ├── main.ts           # Service-based main process
│   └── preload.ts        # Preload script for IPC
├── public/               # Static assets
├── assets/                # Application icons and resources
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

### Prerequisites for Cross-Platform Builds

Before building for multiple platforms, ensure you have the necessary tools installed:

#### Building on macOS
- **For macOS builds**: Xcode Command Line Tools (pre-installed)
- **For Windows builds**: 
  ```bash
  brew install wine-stable mono
  ```
- **For Linux builds**:
  ```bash
  brew install dpkg fakeroot
  ```

#### Building on Windows
- **For Windows builds**: Visual Studio Build Tools (pre-installed)
- **For macOS/Linux builds**: Use WSL2 or Docker

#### Building on Linux
- **For Linux builds**: build-essential (pre-installed)
- **For Windows builds**: Wine and Mono
- **For macOS builds**: Difficult, recommend using CI/CD

### Icon Requirements

Ensure you have the following icon files in the `assets/icons/` directory:
- `icon.png` - PNG format icon for Linux
- `icon.ico` - ICO format icon for Windows  
- `icon.icns` - ICNS format icon for macOS

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

# Create distributable (ZIP)
npm run make
```

**Output Files:**
- `out/Helios-darwin-arm64/Helios.app` - macOS Application Bundle
- `out/make/zip/darwin/arm64/Helios-darwin-arm64-0.0.0.zip` - Zipped Application

##### Build for Different Architectures
```bash
# For Intel Macs (x64)
npm run make -- --arch=x64

# For Apple Silicon Macs (arm64) 
npm run make -- --arch=arm64

# Universal build (both architectures)
npm run make -- --arch=universal
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

##### Cross-compile from macOS
```bash
# First install Wine and Mono (requires admin/sudo)
brew install wine-stable mono

# Build for Windows
npm run make -- --platform=win32

# For specific architectures
npm run make -- --platform=win32 --arch=x64
npm run make -- --platform=win32 --arch=arm64
```

**Note**: Wine installation requires sudo access. If you can't install Wine, use GitHub Actions or a Windows machine.

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
- `out/Helios-linux-x64/Helios` - Linux Executable
- `out/make/deb/x64/helios_0.0.0_amd64.deb` - Debian Package
- `out/make/rpm/x64/helios-0.0.0-1.x86_64.rpm` - RPM Package (if rpmbuild installed)

##### Cross-compile from macOS
```bash
# First install dpkg and fakeroot
brew install dpkg fakeroot

# For RPM support also install
brew install rpm

# Build for Linux (DEB only)
npm run make -- --platform=linux

# For specific architectures
npm run make -- --platform=linux --arch=x64
npm run make -- --platform=linux --arch=arm64
```

**Important Notes**:
- Ensure `package.json` includes a `description` field for Linux builds
- Icon files must exist in `assets/icons/` directory
- RPM builds require additional setup and may not work cross-platform

### Cross-Platform Building Guide

#### Building All Platforms from macOS

```bash
# 1. Ensure icon files exist
mkdir -p assets/icons
# Copy your icon files to assets/icons/icon.{png,ico,icns}

# 2. Build for macOS (native)
npm run make

# 3. Build for Windows (requires Wine)
# First install: brew install wine-stable mono
npm run make -- --platform=win32

# 4. Build for Linux (requires dpkg/fakeroot)
# First install: brew install dpkg fakeroot
npm run make -- --platform=linux
```

#### Common Build Issues and Solutions

##### Icon File Errors
```bash
# Create icon directory
mkdir -p assets/icons

# Convert existing icon to required formats
# PNG → ICO (for Windows)
sips -s format png src/assets/icons/icon.jpeg --out assets/icons/icon.png
# You'll need to convert PNG to ICO using an online tool or ImageMagick

# For macOS ICNS, use iconutil or online converter
```

##### Linux Build Name Mismatch
If you get "could not find Electron app binary" error:
1. Check that `executableName` in `forge.config.js` matches package name
2. Ensure `package.json` has a `description` field

##### Windows Build on macOS
If Wine installation fails:
```bash
# Alternative: Use GitHub Actions (see CI/CD section)
# Or use a Windows VM/machine for native builds
```

#### Using Docker for Cross-Platform Builds

##### Linux Builds via Docker
```bash
# Build Linux version using Docker
docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS|APPVEYOR|BUILDKITE') \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ${PWD##*/}-node-modules:/project/node_modules \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && npm install && npm run make -- --platform=linux"
```

##### Windows Builds via Docker
```bash
# Windows builds in Docker (experimental)
docker run --rm -ti \
  -v ${PWD}:/project \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && npm install && npm run make -- --platform=win32"
```

### CI/CD for Multi-Platform Builds (Recommended)

#### GitHub Actions Configuration

Create `.github/workflows/build.yml`:

```yaml
name: Build Releases

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
        
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run make
      
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-build
        path: out/make/**/*
```

This ensures native builds on each platform without cross-compilation issues.

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

## Quick Reference: Building for All Platforms

### From macOS (Most Common Scenario)

```bash
# Prerequisites
brew install dpkg fakeroot  # For Linux builds
brew install wine-stable mono  # For Windows builds (requires sudo)

# Create required icon files
mkdir -p assets/icons
cp src/assets/icons/icon.jpeg assets/icons/icon.png
# Convert to .ico and .icns as needed

# Build all platforms
npm run make                    # macOS (native)
npm run make -- --platform=win32   # Windows (if Wine installed)
npm run make -- --platform=linux   # Linux (.deb only)
```

### Build Output Locations

| Platform | Output Location | File Type |
|----------|----------------|-----------|
| macOS | `out/make/zip/darwin/arm64/` | `.zip` |
| Windows | `out/make/squirrel.windows/arm64/` | `.exe` installer |
| Linux | `out/make/deb/arm64/` | `.deb` package |

### Troubleshooting External Builds

1. **Missing Icons**: Create `assets/icons/` with `icon.png`, `icon.ico`, `icon.icns`
2. **Linux Description Error**: Add `"description"` to `package.json`
3. **Wine Installation Fails**: Use GitHub Actions or native Windows machine
4. **RPM Build Fails**: Comment out RPM maker in `forge.config.js`

### Recommended Approach

For production releases, use **GitHub Actions** to build on native platforms:
- Avoids cross-compilation issues
- Ensures proper code signing
- Builds all platforms in parallel
- Automatic artifact collection

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