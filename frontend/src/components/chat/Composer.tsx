import { ArrowUp, Square } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chat-store';

export const Composer: React.FC = () => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopGeneration, isStreaming } = useChatStore();

  const charCount = input.length;
  const isOverLimit = charCount > 4000;
  const isNearLimit = charCount >= 3500;

  // Auto-resize textarea hingga maksimal 6 baris (sekitar 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      await stopGeneration();
      return;
    }

    if (!input.trim() || isOverLimit) return;

    const messageText = input;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl px-4 pb-4 mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col rounded-2xl border border-zinc-300 bg-white shadow-sm transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan... (Shift + Enter untuk baris baru)"
            rows={1}
            maxLength={4100}
            className="w-full resize-none border-none bg-transparent px-4 pt-3.5 pb-2 text-base text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
          />

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="text-xs">
              {isNearLimit && (
                <span className={isOverLimit ? 'font-semibold text-rose-500' : 'text-amber-500'}>
                  {charCount}/4.000
                </span>
              )}
            </div>

            <div>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => void stopGeneration()}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-800 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  title="Hentikan respons"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Hentikan</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isOverLimit}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
                  title="Kirim pesan"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Asisten AI dapat membuat kekeliruan. Harap verifikasi informasi penting.
      </p>
    </div>
  );
};
