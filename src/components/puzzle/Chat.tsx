"use client";

import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Smile, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useIsDark } from "@/lib/useIsDark";
import type { ChatMessage } from "@/lib/puzzle/types";

type Props = {
  messages: ChatMessage[];
  myName: string;
  onSend: (content: string) => void;
  onClose?: () => void;
};

export function Chat({ messages, myName, onSend, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isDark = useIsDark();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
    setPickerOpen(false);
  }

  function handleEmojiClick(data: EmojiClickData) {
    setDraft((prev) => (prev + data.emoji).slice(0, 500));
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 font-medium dark:border-neutral-800">
        Chat
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar chat"
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">Aún no hay mensajes. Saluda para empezar.</p>
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

      <form onSubmit={handleSubmit} className="relative flex gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        {pickerOpen && (
          <div ref={pickerRef} className="absolute bottom-full left-3 mb-2 z-10">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={isDark ? Theme.DARK : Theme.LIGHT}
              searchDisabled
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              width={300}
              height={360}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Insertar emoji"
          className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-300 px-2.5 text-neutral-500 transition hover:border-violet-400 hover:text-violet-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-violet-400"
        >
          <Smile size={18} strokeWidth={1.75} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Escribe un mensaje…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
