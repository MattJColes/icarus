import React, { useEffect, useRef } from 'react';
import { Copy, User, Bot, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showThinking } = useAppStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto helios-scrollbar p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            showThinking={showThinking}
            onCopy={copyToClipboard}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

interface MessageItemProps {
  message: Message;
  showThinking: boolean;
  onCopy: (text: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showThinking, onCopy }) => {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-secondary/10' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User size={16} className="text-secondary" />
        ) : (
          <Bot size={16} className="text-primary" />
        )}
      </div>

      <div className={clsx('flex-1 group', isUser && 'flex flex-col items-end')}>
        {showThinking && message.thinking && (
          <details className="mb-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show thinking
            </summary>
            <div className="mt-1 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              {message.thinking}
            </div>
          </details>
        )}

        <div
          className={clsx(
            'relative max-w-[85%] rounded-lg px-4 py-2',
            isUser
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-muted'
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.content}
          </div>

          {!isUser && (
            <button
              onClick={() => onCopy(message.content)}
              className={clsx(
                'absolute top-2 right-2 opacity-0 group-hover:opacity-100',
                'transition-opacity p-1 rounded hover:bg-background/50'
              )}
              aria-label="Copy message"
            >
              <Copy size={14} />
            </button>
          )}
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};