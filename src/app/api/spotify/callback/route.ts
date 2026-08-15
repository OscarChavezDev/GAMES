import { NextResponse, type NextRequest } from "next/server";
import { basicAuthHeader, getSpotifyCredentials } from "@/lib/spotify/config";
import { saveSpotifyConnection } from "@/lib/spotify/tokens";

function decodeState(raw: string): { roomId: string; name: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof decoded.roomId !== "string") return null;
    return { roomId: decoded.roomId, name: typeof decoded.name === "string" ? decoded.name : "" };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const decoded = state ? decodeState(state) : null;
  if (!decoded) {
    return NextResponse.redirect(new URL("/puzzle", origin));
  }

  const roomUrl = new URL(`/puzzle/${decoded.roomId}`, origin);
  if (error || !code) {
    return NextResponse.redirect(roomUrl);
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/spotify/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(roomUrl);
  }

  const json = await tokenRes.json();
  await saveSpotifyConnection({
    roomId: decoded.roomId,
    connectedBy: decoded.name || "Alguien",
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: json.expires_in,
  });

  return NextResponse.redirect(roomUrl);
}
