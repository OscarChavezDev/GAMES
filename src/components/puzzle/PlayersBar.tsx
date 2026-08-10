"use client";

import { useState } from "react";
import type { ParticipantView } from "@/lib/puzzle/useRoomChannel";

type Props = {
  participants: ParticipantView[];
  shareUrl: string;
};

export function PlayersBar({ participants, shareUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context); the URL
      // is still visible for manual copying, so this is a soft failure.
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex flex-wrap items-center gap-2">
        {participants.length === 0 && (
          <span className="text-sm text-neutral-500">Conectando…</span>
        )}
        {participants.map((p) => (
          <span
            key={p.participantId}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-1.5 pr-3 text-sm dark:bg-neutral-800"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: p.color }}
              aria-hidden
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            {p.name}
            {p.role === "spectator" && (
              <span className="text-xs text-neutral-500">(espectador)</span>
            )}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
      >
        {copied ? "¡Copiado! ✓" : "🔗 Invitar"}
      </button>
    </div>
  );
}
