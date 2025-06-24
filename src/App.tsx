import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme/ThemeProvider';
import { MainLayout } from './components/layout/MainLayout';
import { ChatView } from './features/chat/ChatView';
import { useAppStore } from './store/appStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <MainLayout>
          <ChatView />
        </MainLayout>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;