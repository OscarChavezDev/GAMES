"use client";

import { useState } from "react";

export function HintCard({ imageUrl }: { imageUrl: string }) {
  // Starts collapsed: a big preview card immediately competing with the
  // players bar / status banners for the same top-right corner caused
  // overlap, especially on narrow screens. A tap away is enough for
  // something that's a reference, not a primary UI element.
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mostrar imagen de referencia"
        className="fixed right-3 top-20 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg shadow-lg transition hover:scale-105 dark:border-neutral-700 dark:bg-neutral-900 sm:right-6"
      >
        🖼️
      </button>
    );
  }

  return (
    <div className="fixed right-3 top-20 z-30 w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 sm:right-6 sm:w-44">
      <div className="flex items-center justify-between border-b border-neutral-200 px-2 py-1 dark:border-neutral-800">
        <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
          Referencia
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Ocultar referencia"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ✕
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Imagen de referencia del rompecabezas" className="block w-full" />
    </div>
  );
}
