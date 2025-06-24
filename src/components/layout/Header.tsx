import React from 'react';
import { Menu, Sun, Moon, Monitor, Minus, Square, X } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, setTheme } = useTheme();
  const { currentModel, currentModelCapabilities, isOllamaReady } = useAppStore();

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="helios-button-ghost p-2 rounded-md lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'w-2 h-2 rounded-full',
                isOllamaReady ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentModel || 'No model selected'}
              </span>
              {currentModel && currentModelCapabilities && (
                <div className="flex items-center gap-1">
                  {currentModelCapabilities.supportsThinking && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                      Thinking
                    </span>
                  )}
                  {currentModelCapabilities.supportsVision && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                      Vision
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <WindowControls />
        </div>
      </div>
    </header>
  );
};

interface ThemeToggleProps {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
      <button
        onClick={() => setTheme('light')}
        className={clsx(
          'p-1.5 rounded transition-colors',
          theme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        )}
        aria-label="Light theme"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={clsx(
          'p-1.5 rounded transition-colors',
          theme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        )}
        aria-label="Dark theme"
      >
        <Moon size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={clsx(
          'p-1.5 rounded transition-colors',
          theme === 'system' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        )}
        aria-label="System theme"
      >
        <Monitor size={16} />
      </button>
    </div>
  );
};

const WindowControls: React.FC = () => {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleMinimize}
        className="p-1.5 rounded transition-colors hover:bg-muted"
        aria-label="Minimize window"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={handleMaximize}
        className="p-1.5 rounded transition-colors hover:bg-muted"
        aria-label="Maximize window"
      >
        <Square size={14} />
      </button>
      <button
        onClick={handleClose}
        className="p-1.5 rounded transition-colors hover:bg-red-500/20 hover:text-red-400"
        aria-label="Close window"
      >
        <X size={14} />
      </button>
    </div>
  );
};