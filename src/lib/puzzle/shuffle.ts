import { pieceKey, type RoomPieceState } from "./types";

/**
 * Builds the starting layout for every piece: scattered in a "tray" area
 * below the board, in solved order z-index. Coordinates are in the same
 * natural image-pixel space as `image_width`/`image_height`, so both
 * players share one absolute frame of reference regardless of how big
 * their own screen renders the board (the board component scales the
 * whole thing down/up with a single CSS transform).
 *
 * This runs once, server-side, at room creation, and the result is stored
 * in `rooms.piece_state` — clients read it from the database rather than
 * each computing their own shuffle, so there's no risk of the two players
 * disagreeing on where a piece started.
 */
export function generateInitialPieceState(
  rows: number,
  cols: number,
  boardWidth: number,
  boardHeight: number
): RoomPieceState {
  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;

  const trayTop = boardHeight + Math.max(40, pieceHeight * 0.5);
  const trayHeight = boardHeight * 0.9;

  const maxX = Math.max(0, boardWidth - pieceWidth);
  const maxY = Math.max(0, trayHeight - pieceHeight);

  const state: RoomPieceState = {};
  let z = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      state[pieceKey(row, col)] = {
        row,
        col,
        x: Math.round(Math.random() * maxX),
        y: Math.round(trayTop + Math.random() * maxY),
        locked: false,
        z: z++,
      };
    }
  }
  return state;
}

/** Total vertical space the board + scatter tray need, in board-pixel units. */
export function boardWithTrayHeight(boardHeight: number): number {
  return boardHeight * 2 + 40;
}
