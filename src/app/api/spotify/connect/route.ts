import { NextResponse, type NextRequest } from "next/server";
import { getSpotifyCredentials, SPOTIFY_SCOPES } from "@/lib/spotify/config";

/**
 * Kicks off the OAuth flow: redirects to Spotify's consent screen, with the
 * room id and the connecting player's name packed into `state` so the
 * callback knows which room to attach the resulting tokens to.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  const name = (searchParams.get("name") ?? "").slice(0, 40);

  if (!roomId) {
    return NextResponse.redirect(new URL("/puzzle", origin));
  }

  const { clientId } = getSpotifyCredentials();
  const state = Buffer.from(JSON.stringify({ roomId, name })).toString("base64url");

  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", `${origin}/api/spotify/callback`);
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("show_dialog", "true");

  return NextResponse.redirect(authorizeUrl);
}
