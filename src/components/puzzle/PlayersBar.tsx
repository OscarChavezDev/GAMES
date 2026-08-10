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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-3">
        {participants.length === 0 && (
          <span className="text-sm text-neutral-500">Conectando…</span>
        )}
        {participants.map((p) => (
          <span
            key={p.participantId}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
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
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
      >
        {copied ? "¡Copiado!" : "Copiar link para invitar"}
      </button>
    </div>
  );
}
