import { notFound } from "next/navigation";

import RoomClient from "@/components/puzzle/RoomClient";
import type { ChatMessage, Room } from "@/lib/puzzle/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const MESSAGE_HISTORY_LIMIT = 200;

type PageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ host?: string }>;
};

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { roomId } = await params;
  const { host } = await searchParams;

  const admin = getSupabaseAdminClient();

  const [{ data: room, error: roomError }, { data: messages, error: messagesError }] =
    await Promise.all([
      admin.from("rooms").select("*").eq("id", roomId).maybeSingle(),
      admin
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(MESSAGE_HISTORY_LIMIT),
    ]);

  if (roomError || !room) {
    notFound();
  }
  if (messagesError) {
    console.error(messagesError);
  }

  return (
    <RoomClient
      room={room as Room}
      initialMessages={(messages ?? []) as ChatMessage[]}
      hostNameFromQuery={host ?? null}
    />
  );
}
