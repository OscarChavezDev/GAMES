"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/puzzle/types";

type Props = {
  messages: ChatMessage[];
  myName: string;
  onSend: (content: string) => void;
};

export function Chat({ messages, myName, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-2.5 font-medium dark:border-neutral-800">
        Chat
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">Aún no hay mensajes. ¡Saluda!</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_name === myName;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-xs text-neutral-500">{m.sender_name}</span>
              <span
                className={`max-w-[85%] break-words rounded-2xl px-3 py-1.5 text-sm ${
                  isMe
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {m.content}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Escribe un mensaje…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
