import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming }) => {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none text-base leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !codeString.includes('\n');

            if (isInline) {
              return (
                <code
                  className="rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match ? match[1] : 'text'} value={codeString} />;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-zinc-100 px-3 py-2 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-t border-zinc-200 px-3 py-2 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand-600 underline underline-offset-2 hover:text-brand-500 dark:text-brand-400"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="cursor-blink" aria-hidden="true" />}
    </div>
  );
};
