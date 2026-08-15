"use client";

import { PartyPopper, Puzzle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Board } from "@/components/puzzle/Board";
import { ChatBubble } from "@/components/puzzle/ChatBubble";
import { PlayersBar } from "@/components/puzzle/PlayersBar";
import { createParticipantId } from "@/lib/id";
import { pieceCount } from "@/lib/puzzle/difficulties";
import { useRoomChannel } from "@/lib/puzzle/useRoomChannel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ChatMessage, PieceState, Room, RoomStatus } from "@/lib/puzzle/types";

type Props = {
  room: Room;
  initialMessages: ChatMessage[];
  hostNameFromQuery: string | null;
};

function storageKey(roomId: string, kind: "participantId" | "name") {
  return `puzzle:${roomId}:${kind}`;
}

export default function RoomClient({ room, initialMessages, hostNameFromQuery }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  // Identity (participantId, display name) lives in sessionStorage, which
  // only exists in the browser. To avoid an SSR/hydration mismatch, both
  // the server render and the client's first render show a neutral
  // "loading" state; the real identity is resolved in an effect that only
  // ever runs client-side, then we re-render with it.
  const [identity, setIdentity] = useState<{ participantId: string; name: string | null } | null>(
    null
  );
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    const pid =
      window.sessionStorage.getItem(storageKey(room.id, "participantId")) ?? createParticipantId();
    window.sessionStorage.setItem(storageKey(room.id, "participantId"), pid);

    let resolvedName = window.sessionStorage.getItem(storageKey(room.id, "name"));
    if (!resolvedName && hostNameFromQuery) {
      resolvedName = hostNameFromQuery;
      window.sessionStorage.setItem(storageKey(room.id, "name"), resolvedName);
    }
    if (hostNameFromQuery) {
      window.history.replaceState(null, "", `/puzzle/${room.id}`);
    }

    // Single setState call: this effect exists specifically to bridge a
    // browser-only source (sessionStorage) into React state on mount, which
    // is the one case an effect+setState is unavoidable — the value isn't
    // knowable during SSR/first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity({ participantId: pid, name: resolvedName });
  }, [room.id, hostNameFromQuery]);

  const ready = identity !== null;
  const participantId = identity?.participantId ?? "";
  const name = identity?.name ?? null;

  const [pieces, setPieces] = useState(room.piece_state);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const nextZRef = useRef(1 + Math.max(0, ...Object.values(room.piece_state).map((p) => p.z)));
  const lastMoveSentRef = useRef(0);

  const totalPieces = pieceCount({ rows: room.grid_rows, cols: room.grid_cols });

  const {
    connected,
    participants,
    me,
    heldBy,
    messages,
    sendChat,
    broadcastGrab,
    broadcastMove,
    broadcastRelease,
    broadcastStatus,
  } = useRoomChannel({
    roomId: room.id,
    participantId,
    name: name ?? "",
    initialMessages,
    onPieceGrab: (pieceKey) => {
      setPieces((prev) => {
        const piece = prev[pieceKey];
        if (!piece) return prev;
        nextZRef.current += 1;
        return { ...prev, [pieceKey]: { ...piece, z: nextZRef.current } };
      });
    },
    onPieceMove: (pieceKey, x, y) => {
      setPieces((prev) => {
        const piece = prev[pieceKey];
        if (!piece) return prev;
        return { ...prev, [pieceKey]: { ...piece, x, y } };
      });
    },
    onPieceRelease: (pieceKey, piece) => {
      setPieces((prev) => ({ ...prev, [pieceKey]: piece }));
    },
    onStatusChanged: (nextStatus) => setStatus(nextStatus),
  });

  function handleGrab(pieceKey: string) {
    setPieces((prev) => {
      const piece = prev[pieceKey];
      if (!piece) return prev;
      nextZRef.current += 1;
      return { ...prev, [pieceKey]: { ...piece, z: nextZRef.current } };
    });
    broadcastGrab(pieceKey);

    if (status === "waiting") {
      setStatus("playing");
      broadcastStatus("playing");
      supabase.rpc("set_room_playing", { p_room_id: room.id }).then(({ error }) => {
        if (error) console.error(error);
      });
    }
  }

  function handleMove(pieceKey: string, x: number, y: number) {
    setPieces((prev) => {
      const piece = prev[pieceKey];
      if (!piece) return prev;
      return { ...prev, [pieceKey]: { ...piece, x, y } };
    });

    const now = performance.now();
    if (now - lastMoveSentRef.current > 45) {
      lastMoveSentRef.current = now;
      broadcastMove(pieceKey, x, y);
    }
  }

  function handleRelease(pieceKey: string, x: number, y: number, locked: boolean) {
    setPieces((prev) => {
      const piece = prev[pieceKey];
      if (!piece) return prev;

      const nextPiece: PieceState = { ...piece, x, y, locked };
      const nextPieces = { ...prev, [pieceKey]: nextPiece };

      broadcastRelease(pieceKey, nextPiece);
      supabase
        .rpc("update_piece", { p_room_id: room.id, p_piece_key: pieceKey, p_piece: nextPiece })
        .then(({ error }) => {
          if (error) console.error(error);
        });

      const allLocked = Object.values(nextPieces).every((p) => p.locked);
      if (allLocked && status !== "completed") {
        setStatus("completed");
        broadcastStatus("completed");
        supabase.rpc("complete_room", { p_room_id: room.id }).then(({ error }) => {
          if (error) console.error(error);
        });
      }

      return nextPieces;
    });
  }

  const colorByParticipant = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of participants) map[p.participantId] = p.color;
    return map;
  }, [participants]);

  // Not rendered as text anywhere (only read inside the copy-to-clipboard
  // click handler in PlayersBar), so computing it directly during render is
  // safe — there's no server/client markup to mismatch.
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/puzzle/${room.id}` : "";

  if (!ready) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-violet-50 via-white to-white px-4 text-center dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
        <p className="text-neutral-500">Cargando partida…</p>
      </main>
    );
  }

  if (!name) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-violet-50 via-white to-white px-4 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200/70 bg-white/90 p-6 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <Puzzle size={24} strokeWidth={1.75} />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Únete a la partida</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {room.host_name} te invitó a armar un rompecabezas juntos.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = nameDraft.trim().slice(0, 40);
              if (!trimmed) return;
              window.sessionStorage.setItem(storageKey(room.id, "name"), trimmed);
              setIdentity((prev) => (prev ? { ...prev, name: trimmed } : prev));
            }}
            className="mt-5 flex flex-col gap-3"
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              placeholder="¿Cómo te llamas?"
              className="rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white transition hover:bg-violet-700 active:scale-95"
            >
              Entrar a jugar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white pb-4 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-6">
        <PlayersBar participants={participants} shareUrl={shareUrl} />

        {!connected && (
          <p className="text-sm text-amber-600 dark:text-amber-400">Conectando a la partida…</p>
        )}

        {connected && status === "waiting" && (
          <p className="rounded-xl bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-900">
            Esperando a que alguien mueva la primera pieza para empezar…
          </p>
        )}

        {me?.role === "spectator" && (
          <p className="rounded-xl bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-900">
            Ya hay dos jugadores armando este rompecabezas — estás viendo como espectador, pero
            puedes chatear.
          </p>
        )}

        {status === "completed" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 px-4 py-3 dark:bg-green-950/40">
            <p className="inline-flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
              <PartyPopper size={18} strokeWidth={2} />
              Rompecabezas completado — {totalPieces} de {totalPieces} piezas
            </p>
            <Link
              href="/puzzle"
              className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 active:scale-95"
            >
              Crear otro rompecabezas
            </Link>
          </div>
        )}

        <Board
          seed={room.id}
          imageUrl={room.image_url}
          boardWidth={room.image_width}
          boardHeight={room.image_height}
          rows={room.grid_rows}
          cols={room.grid_cols}
          pieces={pieces}
          heldBy={heldBy}
          colorByParticipant={colorByParticipant}
          interactive={me?.role === "player"}
          onGrab={handleGrab}
          onMove={handleMove}
          onRelease={handleRelease}
        />
      </div>

      <ChatBubble messages={messages} myName={name} onSend={sendChat} />
    </main>
  );
}
