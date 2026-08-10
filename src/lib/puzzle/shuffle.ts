import { pieceKey, type RoomPieceState } from "./types";

export type TrayLayout = {
  pieceWidth: number;
  pieceHeight: number;
  trayCols: number;
  trayRows: number;
  cellWidth: number;
  cellHeight: number;
  trayTop: number;
  trayHeight: number;
  totalHeight: number;
  gap: number;
};

/**
 * Single source of truth for where the "tray" (the shelf of unplaced
 * pieces below the board) sits and how big it is. Both the initial piece
 * shuffle (server-side, at room creation) and the Board component's layout
 * math call this, so they can never disagree about the coordinate space.
 *
 * Pieces are laid out in a snug grid rather than scattered across a large
 * empty area — that reads as an organized shelf instead of a mess, and
 * (importantly) keeps pieces from stacking on top of each other, which
 * made it hard to grab the one you actually meant to.
 */
export function computeTrayLayout(
  rows: number,
  cols: number,
  boardWidth: number,
  boardHeight: number
): TrayLayout {
  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;
  const totalPieces = rows * cols;

  // Match the board's own column count so the tray uses the full board
  // width efficiently — with cols columns and totalPieces = rows*cols,
  // this always works out to exactly `rows` tray rows, keeping the tray's
  // height proportional to the board regardless of piece count.
  const trayCols = cols;
  const trayRows = Math.max(1, Math.ceil(totalPieces / trayCols));

  const cellWidth = pieceWidth;
  const cellHeight = pieceHeight * 1.15;

  const gap = Math.max(28, pieceHeight * 0.3);
  const trayTop = boardHeight + gap;
  const trayHeight = trayRows * cellHeight + gap;

  return {
    pieceWidth,
    pieceHeight,
    trayCols,
    trayRows,
    cellWidth,
    cellHeight,
    trayTop,
    trayHeight,
    totalHeight: trayTop + trayHeight,
    gap,
  };
}

function shuffledIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Builds the starting layout for every piece: laid out in shuffled order
 * across a tidy grid "tray" below the board, each cell nudged with a small
 * random jitter so it still looks hand-scattered rather than robotic.
 * Coordinates are in the same natural image-pixel space as
 * `image_width`/`image_height`, so both players share one absolute frame
 * of reference regardless of how big their own screen renders the board.
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
  const layout = computeTrayLayout(rows, cols, boardWidth, boardHeight);

  const cells: { row: number; col: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) cells.push({ row, col });
  }

  const order = shuffledIndices(cells.length);
  const jitterX = layout.pieceWidth * 0.08;
  const jitterY = layout.pieceHeight * 0.08;

  const state: RoomPieceState = {};
  order.forEach((cellIndex, slot) => {
    const { row, col } = cells[cellIndex];
    const trayRow = Math.floor(slot / layout.trayCols);
    const trayCol = slot % layout.trayCols;

    const baseX = trayCol * layout.cellWidth + (layout.cellWidth - layout.pieceWidth) / 2;
    const baseY = layout.trayTop + trayRow * layout.cellHeight + (layout.cellHeight - layout.pieceHeight) / 2;

    state[pieceKey(row, col)] = {
      row,
      col,
      x: Math.max(0, baseX + (Math.random() * 2 - 1) * jitterX),
      y: Math.max(layout.trayTop, baseY + (Math.random() * 2 - 1) * jitterY),
      locked: false,
      z: slot + 1,
    };
  });

  return state;
}
