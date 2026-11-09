import { ArrowDown, Bot, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chat-store';
import { MessageBubble } from './MessageBubble';

export const ChatViewport: React.FC = () => {
  const { messages, isStreaming, streamingMessageId, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const userScrolledUpRef = useRef(false);

  // Periksa apakah user menggulir ke atas
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 120) {
      setShowScrollBottom(true);
      userScrolledUpRef.current = true;
    } else {
      setShowScrollBottom(false);
      userScrolledUpRef.current = false;
    }
  };

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
  };

  // Auto-scroll saat ada pesan baru atau streaming token
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isStreaming]);

  const starterPrompts = [
    { title: 'Pemrograman', prompt: 'Jelaskan perbedaan Concurrency vs Parallelism pada Go beserta contohnya' },
    { title: 'Arsitektur Sistem', prompt: 'Bantu rancang arsitektur database untuk aplikasi e-commerce multi-vendor' },
    { title: 'Produktivitas', prompt: 'Tuliskan draf email penawaran kerja sama kemitraan profesional' },
    { title: 'Analisis Masalah', prompt: 'Bagaimana cara mendeteksi dan mengatasi memory leak pada aplikasi Node.js?' },
  ];

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm dark:bg-brand-950 dark:text-brand-400">
                <Bot className="h-9 w-9" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                Halo! Ada yang bisa YolaBot bantu hari ini?
              </h1>
              <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                Asisten kecerdasan buatan serba guna siap membantu pemrograman, analisis teknis,
                penulisan naskah, hingga ide kreatif.
              </p>

              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {starterPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => void sendMessage(item.prompt)}
                    className="flex flex-col items-start rounded-xl border border-zinc-200 bg-white p-3.5 text-left text-sm transition-all hover:border-brand-500 hover:bg-zinc-50/50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-400 dark:hover:bg-zinc-850"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </div>
                    <span className="mt-1 line-clamp-2 text-zinc-700 dark:text-zinc-300">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && msg.id === streamingMessageId}
              />
            ))
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-8 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          title="Gulir ke bawah"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
