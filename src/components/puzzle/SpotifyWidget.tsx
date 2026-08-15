"use client";

import { Disc3, Loader2, Music2, Pause, Play, SkipBack, SkipForward, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlAction, NowPlayingResponse } from "@/lib/spotify/types";

type Props = {
  roomId: string;
  myName: string;
};

const POLL_MS = 5000;

export function SpotifyWidget({ roomId, myName }: Props) {
  const [state, setState] = useState<NowPlayingResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<ControlAction | null>(null);
  const [deviceNotice, setDeviceNotice] = useState(false);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch(`/api/spotify/now-playing?roomId=${encodeURIComponent(roomId)}`, {
        cache: "no-store",
      });
      const data: NowPlayingResponse = await res.json();
      setState(data);
    } catch {
      // Transient network hiccup — next poll will retry. Not worth
      // surfacing an error state for a widget that refreshes every 5s.
    }
  }, [roomId]);

  useEffect(() => {
    // fetchNowPlaying's setState runs inside its own async .then/await
    // continuation once the network response arrives, not synchronously
    // during this effect — the "subscribe to an external system" case the
    // rule intends to allow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const deviceNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function sendControl(action: ControlAction) {
    setPendingAction(action);
    try {
      const res = await fetch("/api/spotify/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, action }),
      });
      const data = await res.json();
      if (!data.ok && data.error === "no_active_device") {
        setDeviceNotice(true);
        if (deviceNoticeTimeout.current) clearTimeout(deviceNoticeTimeout.current);
        deviceNoticeTimeout.current = setTimeout(() => setDeviceNotice(false), 5000);
      } else {
        await fetchNowPlaying();
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function disconnect() {
    await fetch("/api/spotify/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    await fetchNowPlaying();
  }

  // Renders a placeholder at the same height as the real states below
  // rather than nothing — this widget sits above the board, and it going
  // from zero height to its real height once the first fetch resolves
  // pushed the whole board down mid-drag if that landed while someone was
  // dragging a piece, making it look like the piece jumped.
  if (!state) {
    return (
      <div className="h-[46px] animate-pulse rounded-2xl border border-neutral-200/70 bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/60" />
    );
  }

  if (!state.connected) {
    return (
      <a
        href={`/api/spotify/connect?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(myName)}`}
        className="flex h-[46px] items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white/90 px-4 text-sm text-neutral-600 shadow-sm backdrop-blur transition hover:border-green-400 hover:text-green-700 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:text-green-400"
      >
        <Music2 size={17} strokeWidth={1.75} />
        Conectar Spotify para compartir la música
      </a>
    );
  }

  const { playing, connectedBy } = state;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {playing?.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={playing.albumArt} alt="" className="h-full w-full object-cover" />
          ) : (
            <Disc3 size={18} className="text-neutral-400" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {playing ? (
            <>
              <p className="truncate text-sm font-medium">{playing.trackName}</p>
              <p className="truncate text-xs text-neutral-500">{playing.artistName}</p>
            </>
          ) : (
            <p className="text-xs text-neutral-500">Sin reproducción activa · conectado por {connectedBy}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => sendControl("previous")}
            disabled={pendingAction !== null}
            aria-label="Canción anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <SkipBack size={15} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => sendControl(playing?.isPlaying ? "pause" : "play")}
            disabled={pendingAction !== null}
            aria-label={playing?.isPlaying ? "Pausar" : "Reproducir"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {pendingAction === "play" || pendingAction === "pause" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : playing?.isPlaying ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => sendControl("next")}
            disabled={pendingAction !== null}
            aria-label="Siguiente canción"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <SkipForward size={15} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={disconnect}
            aria-label="Desconectar Spotify"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800 dark:hover:text-red-400"
          >
            <Unlink size={14} />
          </button>
        </div>
      </div>

      {deviceNotice && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No hay un dispositivo de Spotify activo (o la cuenta no es Premium) — abre Spotify y dale play ahí primero.
        </p>
      )}
    </div>
  );
}
