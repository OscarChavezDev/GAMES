"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // The <html> class is already set correctly before hydration by the
  // inline script in layout.tsx, so we just read it back here — but only
  // after mount, since the server has no way to know it and rendering an
  // icon during SSR would mismatch whatever the script decided.
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Bridges a browser-only value (the class the inline script already
    // set on <html>) into React state on mount — unavoidable since it
    // can't be known during SSR/first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? (isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro") : "Cambiar tema"}
      className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-lg shadow-sm backdrop-blur transition hover:scale-105 dark:border-neutral-700 dark:bg-neutral-900/90"
    >
      {mounted ? (isDark ? "☀️" : "🌙") : null}
    </button>
  );
}
