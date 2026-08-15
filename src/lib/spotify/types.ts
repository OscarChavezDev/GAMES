export type NowPlaying = {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumArt: string | null;
  progressMs: number;
  durationMs: number;
};

export type NowPlayingResponse =
  | { connected: false }
  | { connected: true; connectedBy: string; playing: NowPlaying | null };

export type ControlAction = "play" | "pause" | "next" | "previous";
