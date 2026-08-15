"use client";

import { useEffect, useState } from "react";

/** Tracks the `.dark` class on <html>, which ThemeToggle flips — for
 * components (like a themed third-party widget) that need to know the
 * current theme reactively, not just read it once. */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bridges a browser-only value on mount, see ThemeToggle for the same pattern
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
