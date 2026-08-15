"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/puzzle/types";
import { Chat } from "./Chat";

type Props = {
  messages: ChatMessage[];
  myName: string;
  onSend: (content: string) => void;
};

export function ChatBubble({ messages, myName, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<ChatMessage | null>(null);
  const seenCountRef = useRef(messages.length);

  useEffect(() => {
    // Bridges an external stream (incoming realtime messages) into a local
    // "unread since I last opened the panel" count — there's no way to
    // derive that purely from props during render, since it depends on
    // *when* `open` last toggled, not just the current message list.
    if (open) {
      seenCountRef.current = messages.length;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnread(0);
      setToast(null);
    } else {
      const newCount = messages.length - seenCountRef.current;
      setUnread(Math.max(0, newCount));
      if (newCount > 0) setToast(messages[messages.length - 1]);
    }
  }, [messages, open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="fixed bottom-4 right-3 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="h-[min(70vh,520px)] w-[88vw] max-w-sm overflow-hidden rounded-2xl border border-neutral-200 shadow-2xl dark:border-neutral-800">
          <Chat messages={messages} myName={myName} onSend={onSend} onClose={() => setOpen(false)} />
        </div>
      )}

      {!open && toast && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="max-w-[80vw] animate-[fade-in-up_0.2s_ease] rounded-2xl rounded-br-sm border border-neutral-200 bg-white p-3 text-left shadow-xl dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-xs"
        >
          <span className="block text-xs font-semibold text-violet-600 dark:text-violet-400">
            {toast.sender_name}
          </span>
          <span className="block truncate text-sm text-neutral-700 dark:text-neutral-300">
            {toast.content}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-2xl text-white shadow-lg transition hover:scale-105 hover:bg-violet-700 ${
          !open && unread > 0 ? "animate-[pulse-ring_1.6s_ease-in-out_infinite]" : ""
        }`}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
