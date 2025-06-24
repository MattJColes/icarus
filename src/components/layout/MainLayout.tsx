import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { clsx } from 'clsx';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Top drag area */}
      <div 
        className="absolute top-0 left-0 right-0 h-8 z-50 cursor-move" 
        style={{ 
          WebkitAppRegion: 'drag',
          background: 'transparent',
          pointerEvents: 'auto'
        }}
      />
      
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};