import { NextResponse, type NextRequest } from "next/server";
import { getValidAccessToken } from "@/lib/spotify/tokens";
import type { ControlAction } from "@/lib/spotify/types";

const ACTIONS: Record<ControlAction, { method: string; path: string }> = {
  play: { method: "PUT", path: "/v1/me/player/play" },
  pause: { method: "PUT", path: "/v1/me/player/pause" },
  next: { method: "POST", path: "/v1/me/player/next" },
  previous: { method: "POST", path: "/v1/me/player/previous" },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const roomId: string | undefined = body?.roomId;
  const action: ControlAction | undefined = body?.action;
  const spec = action ? ACTIONS[action] : undefined;

  if (!roomId || !spec) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const token = await getValidAccessToken(roomId);
  if (!token) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 404 });
  }

  const res = await fetch(`https://api.spotify.com${spec.path}`, {
    method: spec.method,
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  // 404 here means Spotify has no active device to control — most commonly
  // a free (non-Premium) account, since the Web API can't drive playback
  // for those regardless of device state.
  if (res.status === 404) {
    return NextResponse.json({ ok: false, error: "no_active_device" }, { status: 409 });
  }
  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ ok: false, error: "spotify_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
