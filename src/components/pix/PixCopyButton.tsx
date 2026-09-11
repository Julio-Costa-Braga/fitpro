"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function PixCopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 transition-all"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "PIX copiado!" : label}
    </button>
  );
}