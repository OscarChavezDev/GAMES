import { NextResponse, type NextRequest } from "next/server";
import { disconnectSpotify } from "@/lib/spotify/tokens";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const roomId: string | undefined = body?.roomId;
  if (!roomId) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  await disconnectSpotify(roomId);
  return NextResponse.json({ ok: true });
}
