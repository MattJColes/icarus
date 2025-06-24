import React from 'react';
import ReactMarkdown from 'react-markdown';

// File path detection utility
const detectFilePaths = (text: string): Array<{ path: string; start: number; end: number }> => {
  const filePathPatterns = [
    // Absolute paths (Unix/Linux/Mac) - more comprehensive file extensions
    /(?:^|\s)(\/(?:[^\/\s\[\](){}]+\/)*[^\/\s\[\](){}]*\.[a-zA-Z0-9]{1,10})(?=\s|$|[.,;:!?)\]}])/g,
    // Absolute paths (Windows)  
    /(?:^|\s)([A-Z]:\\(?:[^\\\/\s\[\](){}]+\\)*[^\\\/\s\[\](){}]*\.[a-zA-Z0-9]{1,10})(?=\s|$|[.,;:!?)\]}])/g,
    // Relative paths
    /(?:^|\s)((?:\.\.?\/)*(?:[^\/\s\[\](){}]+\/)*[^\/\s\[\](){}]*\.[a-zA-Z0-9]{1,10})(?=\s|$|[.,;:!?)\]}])/g,
    // Home directory paths
    /(?:^|\s)(~\/(?:[^\/\s\[\](){}]+\/)*[^\/\s\[\](){}]*\.[a-zA-Z0-9]{1,10})(?=\s|$|[.,;:!?)\]}])/g,
    // Paths with quotes
    /(?:^|\s)["']([^"']*\.[a-zA-Z0-9]{1,10})["'](?=\s|$|[.,;:!?)\]}])/g,
  ];

  const matches: Array<{ path: string; start: number; end: number }> = [];
  
  filePathPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const pathMatch = match[1];
      const startIndex = match.index + fullMatch.indexOf(pathMatch);
      const endIndex = startIndex + pathMatch.length;
      
      // Avoid duplicates
      if (!matches.some(m => m.start === startIndex && m.end === endIndex)) {
        matches.push({
          path: pathMatch,
          start: startIndex,
          end: endIndex
        });
      }
    }
  });
  
  return matches.sort((a, b) => a.start - b.start);
};

// Component to render text with clickable file paths
const TextWithFilePaths: React.FC<{ 
  children: string; 
  onOpenInExplorer: (filePath: string) => void;
}> = ({ children, onOpenInExplorer }) => {
  const text = typeof children === 'string' ? children : String(children);
  const filePaths = detectFilePaths(text);
  
  if (filePaths.length === 0) {
    return <>{text}</>;
  }
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  
  filePaths.forEach((fileMatch, index) => {
    // Add text before the file path
    if (fileMatch.start > lastIndex) {
      elements.push(text.slice(lastIndex, fileMatch.start));
    }
    
    // Add clickable file path
    elements.push(
      <button
        key={`file-${index}`}
        onClick={() => onOpenInExplorer(fileMatch.path)}
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '6px',
          padding: '3px 8px',
          color: '#10b981',
          fontSize: 'inherit',
          cursor: 'pointer',
          textDecoration: 'none',
          fontFamily: 'monospace',
          fontWeight: '500',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          margin: '0 2px',
          verticalAlign: 'baseline',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))';
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))';
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        }}
        title={`Click to open directory containing: ${fileMatch.path}`}
      >
        📁 {fileMatch.path}
      </button>
    );
    
    lastIndex = fileMatch.end;
  });
  
  // Add remaining text after the last file path
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  
  return <>{elements}</>;
};

export interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string;
  ragContext?: boolean;
  ragSources?: Array<{
    fileName: string;
    filePath: string;
    excerpt: string;
  }>;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    content?: string;
    base64?: string;
  }>;
}

export interface Settings {
  showThinking: boolean;
}

interface MessageProps {
  message: MessageData;
  settings: Settings;
  isLast: boolean;
  onViewFile: (filePath: string) => void;
  onOpenInExplorer: (filePath: string) => void;
  onAddToChat: (fileName: string, content: string) => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  settings,
  isLast,
  onViewFile,
  onOpenInExplorer,
  onAddToChat,
}) => {
  return (
    <div key={message.id} style={{ marginBottom: '16px' }}>
      {/* Thinking Bubble */}
      {message.thinking && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(123, 63, 97, 0.1), rgba(93, 46, 70, 0.1))',
          border: '1px solid rgba(123, 63, 97, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '8px',
          fontSize: '13px',
          color: '#94a3b8',
          fontStyle: 'italic'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#7B3F61'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: 'linear-gradient(135deg, #7B3F61, #5D2E46)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px'
            }}>
              💭
            </div>
            Thinking...
          </div>
          <ReactMarkdown 
            components={{
              p: ({ children }) => <div style={{ marginBottom: '8px', lineHeight: '1.4' }}>{children}</div>,
              strong: ({ children }) => <span style={{ fontWeight: '600', color: '#7B3F61' }}>{children}</span>,
              em: ({ children }) => <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>{children}</span>
            }}
          >
            {message.thinking}
          </ReactMarkdown>
        </div>
      )}

      {/* Main Message */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
      }}>
        {/* Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: message.role === 'user' 
            ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
            : 'linear-gradient(135deg, #7B3F61, #5D2E46)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          flexShrink: 0
        }}>
          {message.role === 'user' ? '👤' : '🤖'}
        </div>

        {/* Message Content */}
        <div style={{
          maxWidth: '70%',
          background: message.role === 'user' 
            ? 'rgba(79, 70, 229, 0.1)' 
            : 'rgba(30, 20, 30, 0.8)',
          borderRadius: '16px',
          padding: '12px 40px 12px 16px',
          border: message.role === 'user' 
            ? '1px solid rgba(79, 70, 229, 0.3)' 
            : '1px solid #333029',
          position: 'relative'
        }}>
          {/* Copy Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(message.content);
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(123, 63, 97, 0.2)',
              border: '1px solid rgba(123, 63, 97, 0.4)',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#94a3b8',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(123, 63, 97, 0.3)';
              e.currentTarget.style.color = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(123, 63, 97, 0.2)';
              e.currentTarget.style.color = '#94a3b8';
            }}
            title="Copy message to clipboard"
          >
            📋
          </button>
          {message.role === 'assistant' ? (
            <ReactMarkdown 
              components={{
                p: ({ children }) => (
                  <div style={{ marginBottom: '12px', lineHeight: '1.6', color: '#f8fafc' }}>
                    {typeof children === 'string' ? (
                      <TextWithFilePaths onOpenInExplorer={onOpenInExplorer}>
                        {children}
                      </TextWithFilePaths>
                    ) : (
                      React.Children.map(children, (child) => 
                        typeof child === 'string' ? (
                          <TextWithFilePaths onOpenInExplorer={onOpenInExplorer}>
                            {child}
                          </TextWithFilePaths>
                        ) : child
                      )
                    )}
                  </div>
                ),
                h1: ({ children }) => <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#f8fafc' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#f8fafc' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#f8fafc' }}>{children}</h3>,
                ul: ({ children }) => <ul style={{ marginBottom: '12px', paddingLeft: '20px', color: '#f8fafc' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ marginBottom: '12px', paddingLeft: '20px', color: '#f8fafc' }}>{children}</ol>,
                li: ({ children }) => (
                  <li style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                    {typeof children === 'string' ? (
                      <TextWithFilePaths onOpenInExplorer={onOpenInExplorer}>
                        {children}
                      </TextWithFilePaths>
                    ) : (
                      React.Children.map(children, (child) => 
                        typeof child === 'string' ? (
                          <TextWithFilePaths onOpenInExplorer={onOpenInExplorer}>
                            {child}
                          </TextWithFilePaths>
                        ) : child
                      )
                    )}
                  </li>
                ),
                code: ({ children, className }) => {
                  const isBlock = className;
                  return isBlock ? (
                    <pre style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '12px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      fontSize: '13px',
                      marginBottom: '12px',
                      border: '1px solid #333029'
                    }}>
                      <code style={{ color: '#f8fafc' }}>{children}</code>
                    </pre>
                  ) : (
                    <code style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#f8fafc'
                    }}>
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: '3px solid #7B3F61',
                    paddingLeft: '12px',
                    marginBottom: '12px',
                    fontStyle: 'italic',
                    color: '#94a3b8'
                  }}>
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#f8fafc' }}>{children}</strong>,
                em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#94a3b8' }}>{children}</em>
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <>
              <div style={{ color: '#f8fafc', lineHeight: '1.6', fontSize: '14px' }}>
                <TextWithFilePaths onOpenInExplorer={onOpenInExplorer}>
                  {message.content}
                </TextWithFilePaths>
              </div>
              {message.attachments && message.attachments.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {message.attachments.map((attachment, index) => (
                    <div key={index} style={{
                      display: 'inline-block',
                      background: 'rgba(79, 70, 229, 0.2)',
                      border: '1px solid rgba(79, 70, 229, 0.4)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      marginRight: '6px',
                      marginBottom: '4px',
                      fontSize: '12px',
                      color: '#c7d2fe'
                    }}>
                      {attachment.fileType.startsWith('image/') ? '🖼️' : '📄'} {attachment.fileName} ({(attachment.fileSize / 1024).toFixed(1)}KB)
                    </div>
                  ))}
                </div>
              )}
            </>
          )}


          {/* RAG Sources */}
          {message.ragSources && message.ragSources.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#94a3b8', 
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📚 Sources:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {message.ragSources.map((source, index) => (
                  <div key={index} style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onOpenInExplorer(source.filePath)}
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#bbf7d0',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      title={`Open "${source.fileName}" in file explorer\\n\\nContent preview:\\n${source.excerpt.substring(0, 200)}...`}
                    >
                      <span style={{ fontSize: '14px' }}>📁</span>
                      <span style={{ fontWeight: '500' }}>{source.fileName}</span>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add to Chat functionality */}
              <div style={{ 
                marginTop: '8px',
                fontSize: '11px',
                color: '#64748b'
              }}>
                💡 Click 📁 to open in file explorer, 👁️ to view content, or{' '}
                <button
                  onClick={() => {
                    const combinedContent = message.ragSources?.map(s => 
                      `=== ${s.fileName} ===\\n${s.excerpt}`
                    ).join('\\n\\n') || '';
                    onAddToChat('RAG Sources', combinedContent);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7B3F61',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '11px',
                    padding: 0
                  }}
                >
                  add all to chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Metadata */}
      <div style={{
        fontSize: '11px',
        color: '#64748b',
        textAlign: message.role === 'user' ? 'right' : 'left',
        marginTop: '4px',
        paddingLeft: message.role === 'user' ? '0' : '44px',
        paddingRight: message.role === 'user' ? '44px' : '0'
      }}>
        {message.timestamp.toLocaleTimeString()}
        {message.ragContext && (
          <span style={{ marginLeft: '8px' }}>
            📚 Enhanced with documents
          </span>
        )}
      </div>
    </div>
  );
};