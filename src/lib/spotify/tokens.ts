import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { basicAuthHeader, getSpotifyCredentials } from "./config";

type SpotifyConnectionRow = {
  room_id: string;
  connected_by: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export type SpotifyToken = {
  accessToken: string;
  connectedBy: string;
};

async function getConnection(roomId: string): Promise<SpotifyConnectionRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("spotify_connections")
    .select("room_id, connected_by, access_token, refresh_token, expires_at")
    .eq("room_id", roomId)
    .maybeSingle();
  return data;
}

export async function saveSpotifyConnection(params: {
  roomId: string;
  connectedBy: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase.from("spotify_connections").upsert({
    room_id: params.roomId,
    connected_by: params.connectedBy,
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
    expires_at: new Date(Date.now() + params.expiresInSeconds * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function disconnectSpotify(roomId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase.from("spotify_connections").delete().eq("room_id", roomId);
}

/**
 * Returns a currently-valid access token for the room's connected Spotify
 * account, transparently refreshing (and persisting the refreshed token)
 * when the stored one is expired or close to it. Returns null if no one has
 * connected Spotify to this room, or if the refresh itself fails (e.g. the
 * user revoked access from Spotify's side) — callers treat that the same as
 * "not connected".
 */
export async function getValidAccessToken(roomId: string): Promise<SpotifyToken | null> {
  const connection = await getConnection(roomId);
  if (!connection) return null;

  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt - Date.now() > 30_000) {
    return { accessToken: connection.access_token, connectedBy: connection.connected_by };
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();

  await saveSpotifyConnection({
    roomId,
    connectedBy: connection.connected_by,
    accessToken: json.access_token,
    // Spotify doesn't always rotate the refresh token on renewal — keep the
    // existing one when it doesn't send a new one.
    refreshToken: json.refresh_token ?? connection.refresh_token,
    expiresInSeconds: json.expires_in,
  });

  return { accessToken: json.access_token, connectedBy: connection.connected_by };
}
