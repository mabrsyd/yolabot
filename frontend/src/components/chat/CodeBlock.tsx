import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-900 text-zinc-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-1.5 text-xs text-zinc-400">
        <span className="font-mono lowercase text-zinc-300">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-xs font-mono leading-relaxed">
        <pre className="m-0">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

