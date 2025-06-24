import { useState } from 'react';

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export interface Settings {
  showThinking: boolean;
  ragEnabled: boolean;
  ragDirectories: string[];
  ragSensitivity: number;
  selectedModel: string;
  systemPrompt: string;
  temperature: number;
  contextLength: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
}

export interface RagStatus {
  isIndexing: boolean;
  indexingProgress: number;
  lastIndexed: string;
  documentCount: number;
  isIndexed: boolean;
}

export interface InstallProgress {
  installing: boolean;
  message: string;
}

interface SettingsPanelProps {
  settings: Settings;
  availableModels: OllamaModel[];
  ragStatus: RagStatus;
  installProgress: InstallProgress;
  onSettingsChange: (settings: Settings) => void;
  onLoadModels: () => void;
  onSelectDirectory: () => void;
  onRemoveDirectory: (index: number) => void;
  onIndexRAG: () => void;
  onClearRAG: () => void;
  onClearChats: () => void;
  onInstallModel: (modelName: string) => void;
}

const formatFileSize = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)}GB`;
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  availableModels,
  ragStatus,
  installProgress,
  onSettingsChange,
  onLoadModels,
  onSelectDirectory,
  onRemoveDirectory,
  onIndexRAG,
  onClearRAG,
  onClearChats,
  onInstallModel,
}) => {
  const [modelToInstall, setModelToInstall] = useState('');

  const saveSettings = (newSettings: Settings) => {
    onSettingsChange(newSettings);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <h2 style={{ 
        fontSize: '24px', 
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #5D2E46, #7B3F61)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Settings
      </h2>

      {/* Model Selection */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          🤖 Model Selection
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Current Model
          </label>
          <select
            value={settings.selectedModel}
            onChange={(e) => saveSettings({ ...settings, selectedModel: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(30, 20, 30, 0.8)',
              border: '1px solid #333029',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '14px'
            }}
          >
            <option value="">Select a model...</option>
            {availableModels.map(model => (
              <option key={model.name} value={model.name}>
                {model.name} ({formatFileSize(model.size)})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onLoadModels}
          style={{
            padding: '8px 16px',
            background: 'rgba(123, 63, 97, 0.3)',
            border: '1px solid #7B3F61',
            borderRadius: '6px',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh Models
        </button>
      </div>

      {/* Model Parameters */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          🎛️ Model Parameters
        </h3>
        
        {/* Temperature */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Temperature: {settings.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => saveSettings({ ...settings, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Lower = more focused, Higher = more creative
          </div>
        </div>

        {/* Context Length */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Context Length: {settings.contextLength.toLocaleString()} tokens
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={(() => {
              // Convert context length to logarithmic scale (0-100)
              const minLog = Math.log(2000); // 2k
              const maxLog = Math.log(1000000); // 1M
              const currentLog = Math.log(Math.max(2000, Math.min(1000000, settings.contextLength)));
              return Math.round(((currentLog - minLog) / (maxLog - minLog)) * 100);
            })()}
            onChange={(e) => {
              // Convert slider value back to context length
              const sliderValue = parseInt(e.target.value);
              const minLog = Math.log(2000); // 2k
              const maxLog = Math.log(1000000); // 1M
              const logValue = minLog + ((sliderValue / 100) * (maxLog - minLog));
              const contextLength = Math.round(Math.exp(logValue));
              saveSettings({ ...settings, contextLength });
            }}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>2K</span>
            <span>Maximum conversation memory</span>
            <span>1M</span>
          </div>
        </div>

        {/* Top P */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Top P: {settings.topP}
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.topP}
            onChange={(e) => saveSettings({ ...settings, topP: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Nucleus sampling threshold
          </div>
        </div>

        {/* Top K */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Top K: {settings.topK}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={settings.topK}
            onChange={(e) => saveSettings({ ...settings, topK: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Limits vocabulary to top K words
          </div>
        </div>

        {/* Repeat Penalty */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Repeat Penalty: {settings.repeatPenalty}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.repeatPenalty}
            onChange={(e) => saveSettings({ ...settings, repeatPenalty: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Penalty for repeating words/phrases
          </div>
        </div>

        {/* Reset to Defaults Button */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              const defaultParams = {
                temperature: 0.7,
                contextLength: 40000,
                topP: 0.9,
                topK: 40,
                repeatPenalty: 1.1
              };
              saveSettings({ 
                ...settings, 
                ...defaultParams 
              });
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(123, 63, 97, 0.2)',
              border: '1px solid #7B3F61',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* System Prompt */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          💬 System Prompt
        </h3>
        
        <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
          Custom System Prompt (optional)
        </label>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => saveSettings({ ...settings, systemPrompt: e.target.value })}
          placeholder="Enter a custom system prompt to define the AI's behavior and personality..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            background: 'rgba(30, 20, 30, 0.8)',
            border: '1px solid #333029',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            resize: 'vertical',
            outline: 'none'
          }}
        />
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
          This prompt will be added to every conversation. Leave empty to use default behavior.
        </div>
      </div>

      {/* RAG Settings */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          📚 RAG (Retrieval-Augmented Generation)
        </h3>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: 'pointer', 
          marginBottom: '16px',
          fontSize: '14px',
          color: '#94a3b8'
        }}>
          <input
            type="checkbox"
            checked={settings.ragEnabled}
            onChange={(e) => saveSettings({ ...settings, ragEnabled: e.target.checked })}
            style={{ accentColor: '#7B3F61' }}
          />
          Enable RAG document processing
        </label>

        {settings.ragEnabled && (
          <>
            {/* Directory Management */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '8px' 
              }}>
                <label style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Document Directories ({settings.ragDirectories.length}/3)
                </label>
                {settings.ragDirectories.length < 3 && (
                  <button
                    onClick={onSelectDirectory}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(123, 63, 97, 0.3)',
                      border: '1px solid #7B3F61',
                      borderRadius: '4px',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    + Add Directory
                  </button>
                )}
              </div>
              
              {settings.ragDirectories.map((dir, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(30, 20, 30, 0.8)',
                  border: '1px solid #333029',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '13px', 
                    color: '#f8fafc',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    📁 {dir}
                  </span>
                  <button
                    onClick={() => onRemoveDirectory(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '0 4px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* RAG Sensitivity */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                Document Relevance Sensitivity: {settings.ragSensitivity}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={settings.ragSensitivity}
                onChange={(e) => saveSettings({ ...settings, ragSensitivity: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Higher = more selective document matching
              </div>
            </div>

            {/* RAG Status */}
            <div style={{ 
              padding: '12px',
              background: 'rgba(30, 20, 30, 0.8)',
              border: '1px solid #333029',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  RAG Status
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  color: ragStatus.isIndexed ? '#22c55e' : '#f59e0b',
                  padding: '2px 6px',
                  background: ragStatus.isIndexed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '4px'
                }}>
                  {ragStatus.isIndexed ? 'Ready' : 'Not Indexed'}
                </span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                Documents: {ragStatus.documentCount} | Last indexed: {ragStatus.lastIndexed}
              </div>
              
              {ragStatus.isIndexing && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    border: '2px solid transparent',
                    borderTop: '2px solid #7B3F61',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#7B3F61' }}>
                    Indexing... {ragStatus.indexingProgress}%
                  </span>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={onIndexRAG}
                  disabled={ragStatus.isIndexing || settings.ragDirectories.length === 0}
                  style={{
                    padding: '6px 12px',
                    background: ragStatus.isIndexing ? 'rgba(123, 63, 97, 0.2)' : 'rgba(123, 63, 97, 0.3)',
                    border: '1px solid #7B3F61',
                    borderRadius: '4px',
                    color: ragStatus.isIndexing ? '#64748b' : '#f8fafc',
                    cursor: ragStatus.isIndexing ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {ragStatus.isIndexing ? '⏳ Indexing...' : '🔄 Index Documents'}
                </button>
                
                <button
                  onClick={onClearRAG}
                  disabled={ragStatus.isIndexing}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: ragStatus.isIndexing ? '#64748b' : '#f8fafc',
                    cursor: ragStatus.isIndexing ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️ Clear Index
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chat Features */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          💭 Chat Features
        </h3>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: 'pointer', 
          marginBottom: '12px',
          fontSize: '14px',
          color: '#94a3b8'
        }}>
          <input
            type="checkbox"
            checked={settings.showThinking}
            onChange={(e) => saveSettings({ ...settings, showThinking: e.target.checked })}
            style={{ accentColor: '#7B3F61' }}
          />
          💭 Activate thinking (if supported by the model)
        </label>
        
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333029' }}>
          <button
            onClick={() => {
              if (confirm('⚠️ This will permanently delete all chat conversations. This action cannot be undone. Continue?')) {
                onClearChats();
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🗑️ Clear All Chats
          </button>
        </div>
      </div>

      {/* Model Installation */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>
          ⬇️ Install New Model
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={modelToInstall}
            onChange={(e) => setModelToInstall(e.target.value)}
            placeholder="Enter model name (e.g., llama3:8b)"
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(30, 20, 30, 0.8)',
              border: '1px solid #333029',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '14px'
            }}
          />
          <button
            onClick={() => {
              if (modelToInstall.trim()) {
                onInstallModel(modelToInstall.trim());
                setModelToInstall('');
              }
            }}
            disabled={!modelToInstall.trim() || installProgress.installing}
            style={{
              padding: '8px 16px',
              background: (!modelToInstall.trim() || installProgress.installing) 
                ? 'rgba(123, 63, 97, 0.2)' 
                : 'rgba(123, 63, 97, 0.3)',
              border: '1px solid #7B3F61',
              borderRadius: '6px',
              color: (!modelToInstall.trim() || installProgress.installing) ? '#64748b' : '#f8fafc',
              cursor: (!modelToInstall.trim() || installProgress.installing) ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {installProgress.installing ? '⏳' : '⬇️'} Install
          </button>
        </div>
        
        {/* Installation Progress/Status */}
        {(installProgress.installing || installProgress.message) && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: installProgress.installing 
              ? 'rgba(123, 63, 97, 0.1)' 
              : installProgress.message.includes('successfully') 
                ? 'rgba(34, 197, 94, 0.1)' 
                : installProgress.message.includes('Failed') || installProgress.message.includes('Error')
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(123, 63, 97, 0.1)',
            border: installProgress.installing 
              ? '1px solid rgba(123, 63, 97, 0.3)' 
              : installProgress.message.includes('successfully') 
                ? '1px solid rgba(34, 197, 94, 0.3)' 
                : installProgress.message.includes('Failed') || installProgress.message.includes('Error')
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(123, 63, 97, 0.3)',
            borderRadius: '4px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {installProgress.installing ? (
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  border: '2px solid transparent',
                  borderTop: '2px solid #7B3F61',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : installProgress.message.includes('successfully') ? (
                <span style={{ color: '#22c55e' }}>✅</span>
              ) : installProgress.message.includes('Failed') || installProgress.message.includes('Error') ? (
                <span style={{ color: '#ef4444' }}>❌</span>
              ) : (
                <span style={{ color: '#7B3F61' }}>ℹ️</span>
              )}
              <span style={{ 
                fontSize: '12px', 
                color: installProgress.installing 
                  ? '#7B3F61' 
                  : installProgress.message.includes('successfully') 
                    ? '#22c55e' 
                    : installProgress.message.includes('Failed') || installProgress.message.includes('Error')
                      ? '#ef4444'
                      : '#7B3F61'
              }}>
                {installProgress.message}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};