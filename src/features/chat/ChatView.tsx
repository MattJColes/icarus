import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Copy, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { MessageList } from './MessageList';
import { ModelSelector } from './ModelSelector';
import { Message as MessageComponent } from '../../components/Message';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export const ChatView: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    conversations,
    currentModel,
    addMessage,
    addConversation,
    showThinking,
  } = useAppStore();

  const settings = {
    showThinking,
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentModel || isLoading) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConversation = {
        id: uuidv4(),
        title: input.slice(0, 50),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addConversation(newConversation);
      conversationId = newConversation.id;
    }

    const userMessage = {
      id: uuidv4(),
      role: 'user' as const,
      content: input,
      timestamp: new Date(),
    };

    addMessage(conversationId, userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await window.electron.invoke('ollama:chat', {
        model: currentModel,
        messages: [
          ...(activeConversation?.messages || []).map(m => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: input },
        ],
      });

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant' as const,
        content: response[response.length - 1]?.message?.content || 'No response',
        timestamp: new Date(),
      };

      addMessage(conversationId, assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleOpenInExplorer = async (filePath: string) => {
    try {
      await window.electron.invoke('fs:open-directory', filePath);
    } catch (error) {
      console.error('Failed to open file in explorer:', error);
    }
  };

  const handleViewFile = async (filePath: string) => {
    try {
      const result = await window.electron.invoke('fs:read-file', filePath);
      if (result.success) {
        // You can implement a modal or other UI to display file content
        console.log('File content:', result.content);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const handleAddToChat = (fileName: string, content: string) => {
    setInput(prev => prev + `\n\n--- ${fileName} ---\n${content}\n`);
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {activeConversation ? (
          <div className="flex-1 overflow-y-auto helios-scrollbar p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {activeConversation.messages.map((message, index) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  settings={settings}
                  isLast={index === activeConversation.messages.length - 1}
                  onViewFile={handleViewFile}
                  onOpenInExplorer={handleOpenInExplorer}
                  onAddToChat={handleAddToChat}
                />
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2 helios-gradient-text">
                Welcome to Helios
              </h2>
              <p className="text-muted-foreground mb-4">
                Select a model to start chatting
              </p>
              <ModelSelector />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
              >
                <Paperclip size={14} />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleFileAttach}
            className="helios-button-ghost p-2 rounded-md"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={currentModel ? "Type a message..." : "Select a model first..."}
              disabled={!currentModel || isLoading}
              className={clsx(
                'helios-input resize-none min-h-[40px] max-h-[200px]',
                'pr-12'
              )}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || !currentModel || isLoading}
            className={clsx(
              'helios-button-primary p-2 rounded-md',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,.txt,.pdf,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />
      </div>
    </div>
  );
};