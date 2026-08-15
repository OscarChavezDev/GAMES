import "server-only";

// Playback control (pause/skip) only works for Spotify Premium accounts —
// that's a Spotify platform limitation, not something this scope can work
// around. Free accounts can still be *read* (now-playing), just not driven.
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export function getSpotifyCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Revisa tu .env.local (ver .env.local.example)."
    );
  }

  return { clientId, clientSecret };
}

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}
