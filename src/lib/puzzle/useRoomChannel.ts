"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ChatMessage, ParticipantRole, PieceState, RoomStatus } from "./types";

type PresencePayload = {
  participantId: string;
  name: string;
  role: ParticipantRole;
};

export type ParticipantView = PresencePayload & { color: string };

const PLAYER_COLORS = ["#7c3aed", "#f59e0b"]; // violet, amber — one per player slot
const SPECTATOR_COLOR = "#9ca3af"; // neutral gray

type UseRoomChannelArgs = {
  roomId: string;
  participantId: string;
  name: string;
  initialMessages: ChatMessage[];
  onPieceGrab: (pieceKey: string) => void;
  onPieceMove: (pieceKey: string, x: number, y: number) => void;
  onPieceRelease: (pieceKey: string, piece: PieceState) => void;
  onStatusChanged: (status: RoomStatus) => void;
};

export function useRoomChannel({
  roomId,
  participantId,
  name,
  initialMessages,
  onPieceGrab,
  onPieceMove,
  onPieceRelease,
  onStatusChanged,
}: UseRoomChannelArgs) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [connected, setConnected] = useState(false);
  const [rawParticipants, setRawParticipants] = useState<PresencePayload[]>([]);
  const [heldBy, setHeldBy] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // Keep the latest callbacks without having to tear down/recreate the
  // channel every time a parent re-render passes new function identities.
  const callbacksRef = useRef({ onPieceGrab, onPieceMove, onPieceRelease, onStatusChanged });
  useLayoutEffect(() => {
    callbacksRef.current = { onPieceGrab, onPieceMove, onPieceRelease, onStatusChanged };
  });

  useEffect(() => {
    // Wait until we actually know who "we" are (participantId is created
    // client-side, name comes from sessionStorage or a join prompt) before
    // opening the realtime connection.
    if (!participantId || !name) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: participantId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresencePayload>();
      setRawParticipants(Object.values(state).flatMap((entries) => entries));
    });

    channel.on("broadcast", { event: "piece:grab" }, ({ payload }) => {
      const p = payload as { pieceKey: string; participantId: string };
      setHeldBy((prev) => ({ ...prev, [p.pieceKey]: p.participantId }));
      callbacksRef.current.onPieceGrab(p.pieceKey);
    });

    channel.on("broadcast", { event: "piece:move" }, ({ payload }) => {
      const p = payload as { pieceKey: string; x: number; y: number };
      callbacksRef.current.onPieceMove(p.pieceKey, p.x, p.y);
    });

    channel.on("broadcast", { event: "piece:release" }, ({ payload }) => {
      const p = payload as { pieceKey: string; piece: PieceState };
      setHeldBy((prev) => {
        const next = { ...prev };
        delete next[p.pieceKey];
        return next;
      });
      callbacksRef.current.onPieceRelease(p.pieceKey, p.piece);
    });

    channel.on("broadcast", { event: "status:changed" }, ({ payload }) => {
      const p = payload as { status: RoomStatus };
      callbacksRef.current.onStatusChanged(p.status);
    });

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      }
    );

    channel.subscribe(async (status) => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        const state = channel.presenceState<PresencePayload>();
        const currentPlayers = Object.values(state)
          .flatMap((entries) => entries)
          .filter((p) => p.role === "player").length;
        const role: ParticipantRole = currentPlayers < 2 ? "player" : "spectator";
        await channel.track({ participantId, name, role } satisfies PresencePayload);
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, participantId, name, supabase]);

  const participants: ParticipantView[] = useMemo(() => {
    const players = rawParticipants
      .filter((p) => p.role === "player")
      .sort((a, b) => a.participantId.localeCompare(b.participantId));
    const spectators = rawParticipants.filter((p) => p.role === "spectator");

    return [
      ...players.map((p, i) => ({ ...p, color: PLAYER_COLORS[i % PLAYER_COLORS.length] })),
      ...spectators.map((p) => ({ ...p, color: SPECTATOR_COLOR })),
    ];
  }, [rawParticipants]);

  const me = participants.find((p) => p.participantId === participantId) ?? null;

  function broadcastGrab(pieceKey: string) {
    channelRef.current?.send({
      type: "broadcast",
      event: "piece:grab",
      payload: { pieceKey, participantId },
    });
  }

  function broadcastMove(pieceKey: string, x: number, y: number) {
    channelRef.current?.send({
      type: "broadcast",
      event: "piece:move",
      payload: { pieceKey, x, y },
    });
  }

  function broadcastRelease(pieceKey: string, piece: PieceState) {
    channelRef.current?.send({
      type: "broadcast",
      event: "piece:release",
      payload: { pieceKey, piece },
    });
  }

  function broadcastStatus(status: RoomStatus) {
    channelRef.current?.send({
      type: "broadcast",
      event: "status:changed",
      payload: { status },
    });
  }

  async function sendChat(content: string) {
    const trimmed = content.trim().slice(0, 500);
    if (!trimmed) return;
    await supabase.from("messages").insert({
      room_id: roomId,
      sender_name: name,
      content: trimmed,
    });
  }

  return {
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
  };
}
