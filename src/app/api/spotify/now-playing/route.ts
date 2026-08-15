import { NextResponse, type NextRequest } from "next/server";
import { getValidAccessToken } from "@/lib/spotify/tokens";
import type { NowPlayingResponse } from "@/lib/spotify/types";

export async function GET(request: NextRequest) {
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ connected: false } satisfies NowPlayingResponse, { status: 400 });
  }

  const token = await getValidAccessToken(roomId);
  if (!token) {
    return NextResponse.json({ connected: false } satisfies NowPlayingResponse);
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });

  // 204 = nothing playing right now; Spotify also 200s with an empty body
  // in some idle states, and any non-2xx we just treat as "no track" rather
  // than surfacing an error for something this transient.
  if (res.status === 204 || !res.ok) {
    return NextResponse.json({
      connected: true,
      connectedBy: token.connectedBy,
      playing: null,
    } satisfies NowPlayingResponse);
  }

  const data = await res.json().catch(() => null);
  if (!data?.item) {
    return NextResponse.json({
      connected: true,
      connectedBy: token.connectedBy,
      playing: null,
    } satisfies NowPlayingResponse);
  }

  return NextResponse.json({
    connected: true,
    connectedBy: token.connectedBy,
    playing: {
      isPlaying: Boolean(data.is_playing),
      trackName: data.item.name ?? "",
      artistName: Array.isArray(data.item.artists)
        ? data.item.artists.map((a: { name: string }) => a.name).join(", ")
        : "",
      albumArt: data.item.album?.images?.[0]?.url ?? null,
      progressMs: data.progress_ms ?? 0,
      durationMs: data.item.duration_ms ?? 0,
    },
  } satisfies NowPlayingResponse);
}
