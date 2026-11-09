import {
  Check,
  Edit2,
  LogOut,
  MessageSquare,
  Moon,
  MoreVertical,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { formatDateGroup } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
import { useThemeStore } from '../../stores/theme-store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const {
    conversations,
    activeConversationId,
    fetchConversations,
    selectConversation,
    startNewConversation,
    updateConversationTitle,
    deleteConversation,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Filter percakapan berdasarkan input search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [conversations, searchQuery]);

  // Kelompokkan percakapan berdasarkan tanggal (Hari Ini, Kemarin, dll)
  const groupedConversations = useMemo(() => {
    const groups: Record<string, typeof conversations> = {};
    for (const conv of filteredConversations) {
      const groupKey = formatDateGroup(conv.updated_at);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(conv);
    }
    return groups;
  }, [filteredConversations]);

  const handleStartEdit = (conv: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await updateConversationTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Hapus percakapan ini secara permanen?')) {
      await deleteConversation(id);
    }
    setActiveMenuId(null);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: Tombol Chat Baru & Close Mobile */}
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => {
              startNewConversation();
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
          >
            <Plus className="h-4 w-4" />
            <span>Chat Baru</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Kolom Pencarian Cepat */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obrolan..."
              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Daftar Riwayat Obrolan */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {Object.entries(groupedConversations).map(([groupTitle, list]) => (
            <div key={groupTitle} className="space-y-1">
              <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {groupTitle}
              </h3>

              {list.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = conv.id === editingId;

                return (
                  <div key={conv.id} className="relative group">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => void handleSaveEdit(conv.id, e)}
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full rounded border border-brand-500 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <button
                          type="submit"
                          className="rounded p-1 text-emerald-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div
                        onClick={() => {
                          void selectConversation(conv.id);
                          onClose();
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-zinc-200/80 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                            : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span className="truncate">{conv.title}</span>
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-300/60 dark:hover:bg-zinc-700 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-zinc-500" />
                          </button>

                          {activeMenuId === conv.id && (
                            <div className="absolute right-0 top-6 z-20 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                              <button
                                onClick={(e) => handleStartEdit(conv, e)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Ubah Nama</span>
                              </button>
                              <button
                                onClick={(e) => void handleDelete(conv.id, e)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-zinc-400">
              {searchQuery ? 'Tidak ada hasil' : 'Belum ada obrolan'}
            </p>
          )}
        </div>

        {/* Footer Profil Pengguna & Kontrol Tema */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 text-xs dark:bg-brand-950 dark:text-brand-300">
                {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate text-xs">
                <p className="font-medium text-zinc-900 truncate dark:text-zinc-100">
                  {user?.display_name || 'Pengguna'}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">{user?.email || 'Telegram User'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-zinc-400"
                title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                onClick={() => void logout()}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
