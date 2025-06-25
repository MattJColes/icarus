import React from 'react';
import { Plus, MessageSquare, Settings, Database, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';
// Remove the import since it's causing issues

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Icon component with inline SVG - guaranteed to work
const IcarusIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div 
      className={clsx(
        'bg-gradient-to-br from-[#5D2E46] to-[#7B3F61] rounded-md flex items-center justify-center',
        className
      )}
      title="Icarus"
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        className="text-white"
      >
        <path 
          d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" 
          fill="currentColor" 
          opacity="0.9"
        />
        <path 
          d="M12 4L4 8v9c0 4.41 3.16 7.79 8 9 4.84-1.21 8-4.59 8-9V8l-8-4z" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        />
        <circle 
          cx="12" 
          cy="12" 
          r="3" 
          fill="currentColor" 
          opacity="0.7"
        />
      </svg>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
  } = useAppStore();

  const handleNewChat = () => {
    const newConversation = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addConversation(newConversation);
  };

  return (
    <div
      className={clsx(
        'flex flex-col bg-muted/30 border-r border-border transition-all duration-300',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="p-4 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center gap-2">
            <IcarusIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold helios-gradient-text">Icarus</h1>
          </div>
        )}
        {!isOpen && (
          <IcarusIcon className="w-8 h-8 mx-auto" />
        )}
        <button
          onClick={onToggle}
          className="helios-button-ghost p-2 rounded-md"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto helios-scrollbar">
        <div className="p-2">
          <button
            onClick={handleNewChat}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md',
              'helios-button-primary'
            )}
          >
            <Plus size={20} />
            {isOpen && <span>New Chat</span>}
          </button>
        </div>

        <nav className="mt-4 px-2">
          {isOpen && conversations.length > 0 && (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                    'hover:bg-accent/10 transition-colors',
                    activeConversationId === conv.id && 'bg-accent/20'
                  )}
                >
                  <MessageSquare size={16} />
                  <span className="truncate">{conv.title}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
      </div>

      <div className="border-t border-border p-2 space-y-1">
        <SidebarButton
          icon={<Bot size={20} />}
          label="Models"
          isOpen={isOpen}
          onClick={() => {}}
        />
        <SidebarButton
          icon={<Database size={20} />}
          label="RAG"
          isOpen={isOpen}
          onClick={() => {}}
        />
        <SidebarButton
          icon={<Settings size={20} />}
          label="Settings"
          isOpen={isOpen}
          onClick={() => {}}
        />
      </div>
    </div>
  );
};

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onClick: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 rounded-md',
        'hover:bg-accent/10 transition-colors'
      )}
      title={!isOpen ? label : undefined}
    >
      {icon}
      {isOpen && <span className="text-sm">{label}</span>}
    </button>
  );
};