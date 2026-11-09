import { AlertCircle, Bot, Check, Copy, User } from 'lucide-react';
import React, { useState } from 'react';
import { ChatMessage } from '../../lib/api';
import { cn } from '../../lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        'group flex w-full gap-3 py-3 transition-colors',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm dark:bg-brand-500">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div
        className={cn(
          'relative max-w-[85%] sm:max-w-[75%]',
          isUser
            ? 'rounded-2xl rounded-tr-sm bg-zinc-100 px-4 py-2.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
            : 'flex-1 text-zinc-900 dark:text-zinc-100',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-2">
            <MarkdownRenderer content={message.content} isStreaming={isStreaming} />

            {message.status === 'incomplete' && !isStreaming && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Generasi respons dihentikan oleh pengguna.</span>
              </div>
            )}

            {message.status === 'failed' && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Gagal menghasilkan respons lengkap.</span>
              </div>
            )}

            {!isStreaming && message.content.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  title="Salin jawaban"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
