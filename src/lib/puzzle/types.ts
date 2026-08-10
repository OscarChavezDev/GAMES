export type ImageSource = "default" | "custom";

export type RoomStatus = "waiting" | "playing" | "completed";

export type Difficulty = {
  id: string;
  label: string;
  rows: number;
  cols: number;
};

/** Position + solved-state of a single piece, keyed by `${row}-${col}`. */
export type PieceState = {
  row: number;
  col: number;
  /** Current top-left position, in natural image-pixel coordinates. */
  x: number;
  y: number;
  /** True once the piece has been dropped in its correct slot. */
  locked: boolean;
  /** Stacking order so the piece being dragged renders on top. */
  z: number;
};

export type RoomPieceState = Record<string, PieceState>;

export type Room = {
  id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  host_name: string;
  image_url: string;
  image_source: ImageSource;
  image_width: number;
  image_height: number;
  grid_rows: number;
  grid_cols: number;
  status: RoomStatus;
  piece_state: RoomPieceState;
};

export type ChatMessage = {
  id: number;
  room_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export type ParticipantRole = "player" | "spectator";

export type Participant = {
  participantId: string;
  name: string;
  role: ParticipantRole;
  color: string;
};

export function pieceKey(row: number, col: number): string {
  return `${row}-${col}`;
}
