import React, { useEffect, useState } from 'react';
import { ChevronDown, Download, Loader2, Check } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

interface Model {
  name: string;
  size: number;
  modified_at: string;
  supportsThinking?: boolean;
  supportsVision?: boolean;
}

export const ModelSelector: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recommendedModel, setRecommendedModel] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const { currentModel, setCurrentModel, setCurrentModelCapabilities, setInstalledModels } = useAppStore();

  useEffect(() => {
    loadModels();
    loadRecommendedModel();
  }, []);

  // Load capabilities for current model on mount
  useEffect(() => {
    if (currentModel) {
      loadModelCapabilities(currentModel);
    }
  }, [currentModel]);

  const loadModels = async () => {
    try {
      const modelList = await window.electron.invoke('ollama:list');
      setModels(modelList);
      setInstalledModels(modelList.map((m: Model) => m.name));
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadRecommendedModel = async () => {
    try {
      const recommended = await window.electron.invoke('ollama:recommend');
      setRecommendedModel(recommended);
    } catch (error) {
      console.error('Failed to get recommended model:', error);
    }
  };

  const loadModelCapabilities = async (modelName: string) => {
    try {
      const info = await window.electron.invoke('ollama:model-info', modelName);
      setCurrentModelCapabilities({
        supportsThinking: info.supportsThinking || false,
        supportsVision: info.supportsVision || false,
        contextLength: info.contextLength
      });
    } catch (error) {
      console.error('Failed to get model capabilities:', error);
      setCurrentModelCapabilities({
        supportsThinking: false,
        supportsVision: false
      });
    }
  };

  const selectModel = async (modelName: string) => {
    setCurrentModel(modelName);
    await loadModelCapabilities(modelName);
    setIsOpen(false);
  };

  const downloadModel = async (modelName: string) => {
    setIsLoading(true);
    try {
      window.electron.on('ollama:pull:progress', (progress: any) => {
        if (progress.percent) {
          setDownloadProgress(prev => ({
            ...prev,
            [modelName]: progress.percent,
          }));
        }
      });

      await window.electron.invoke('ollama:pull', { model: modelName });
      await loadModels();
      await selectModel(modelName);
    } catch (error) {
      console.error('Failed to download model:', error);
    } finally {
      setIsLoading(false);
      setDownloadProgress(prev => {
        const { [modelName]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
  };

  const isModelInstalled = (modelName: string) => {
    return models.some(m => m.name === modelName);
  };

  const getModelCapabilities = (modelName: string) => {
    const supportsThinking = modelName.toLowerCase().includes('deepseek') ||
                            modelName.toLowerCase().includes('r1') ||
                            modelName.toLowerCase().includes('qwen') ||
                            modelName.toLowerCase().includes('o1');
    
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
                          modelName.toLowerCase().includes('cogvlm');
    
    return { supportsThinking, supportsVision };
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'helios-input flex items-center justify-between gap-2 min-w-[250px]',
          'cursor-pointer hover:border-primary/50'
        )}
      >
        <span className={currentModel ? '' : 'text-muted-foreground'}>
          {currentModel || 'Select a model'}
        </span>
        <ChevronDown size={16} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {models.length > 0 && (
            <>
              <div className="p-2 border-b border-border">
                <div className="text-xs text-muted-foreground mb-1">Installed Models</div>
                {models.map(model => (
                  <button
                    key={model.name}
                    onClick={() => selectModel(model.name)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm',
                      'hover:bg-accent/10 transition-colors text-left',
                      currentModel === model.name && 'bg-accent/20'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <div className="flex items-center gap-1">
                        {getModelCapabilities(model.name).supportsThinking && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">
                            T
                          </span>
                        )}
                        {getModelCapabilities(model.name).supportsVision && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">
                            V
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatSize(model.size)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-1">
              Quick Install
              {recommendedModel && (
                <span className="ml-1 text-primary">(Recommended: {recommendedModel})</span>
              )}
            </div>
            
            {['qwen2.5:0.5b', 'qwen2.5:3b', 'qwen2.5:7b', 'llama3.2:3b'].map(modelName => {
              const progress = downloadProgress[modelName];
              const isInstalled = isModelInstalled(modelName);
              const isRecommended = modelName === recommendedModel;

              return (
                <div
                  key={modelName}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm',
                    'hover:bg-accent/10 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{modelName}</span>
                    <div className="flex items-center gap-1">
                      {getModelCapabilities(modelName).supportsThinking && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">
                          T
                        </span>
                      )}
                      {getModelCapabilities(modelName).supportsVision && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">
                          V
                        </span>
                      )}
                      {isRecommended && (
                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>

                  {isInstalled ? (
                    <Check size={16} className="text-green-500" />
                  ) : progress !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadModel(modelName);
                      }}
                      disabled={isLoading}
                      className="helios-button-ghost p-1 rounded"
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};