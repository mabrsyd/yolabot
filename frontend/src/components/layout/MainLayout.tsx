import { Menu, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { useChatStore } from '../../stores/chat-store';
import { Composer } from '../chat/Composer';
import { ChatViewport } from '../chat/ChatViewport';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { conversations, activeConversationId, startNewConversation } = useChatStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentTitle = activeConversation ? activeConversation.title : 'Percakapan Baru';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Sidebar Navigasi & Riwayat */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Mobile Only */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="max-w-[200px] truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {currentTitle}
          </span>

          <button
            onClick={() => startNewConversation()}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Chat baru"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {/* Viewport Chat Thread */}
        <ChatViewport />

        {/* Composer Prompt Input */}
        <Composer />
      </main>
    </div>
  );
};
