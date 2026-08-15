import { tabPadding } from "./pieceShapes";
import { pieceKey, type RoomPieceState } from "./types";

export type TrayLayout = {
  pieceWidth: number;
  pieceHeight: number;
  canvasWidth: number;
  boardOffsetX: number;
  trayCols: number;
  trayRows: number;
  cellWidth: number;
  cellHeight: number;
  trayTop: number;
  trayHeight: number;
  totalHeight: number;
  gap: number;
};

// A narrow/portrait board (a tall custom image, or a high column count)
// would otherwise force the tray into a tall, narrow, cramped column too —
// this floor lets the tray spread wider than the board itself on anything
// but a small screen. `Board`'s own width-fit scaling still shrinks the
// whole thing proportionally on mobile, so this doesn't fight small
// viewports, it just stops big ones from wasting horizontal space.
const MIN_CANVAS_WIDTH = 900;

/**
 * Single source of truth for where the "tray" (the shelf of unplaced
 * pieces below the board) sits and how big it is. Both the initial piece
 * shuffle (server-side, at room creation) and the Board component's layout
 * math call this, so they can never disagree about the coordinate space.
 *
 * Pieces are laid out in a snug grid rather than scattered across a large
 * empty area — that reads as an organized shelf instead of a mess. Cells
 * are sized to clear each piece's tabs on every side (not just its base
 * rectangle), so neighbors' tabs don't visually collide — the previous
 * zero-gap grid looked fine at 16 pieces but turned into a solid jumble
 * at 100+.
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
  const pad = tabPadding(pieceWidth, pieceHeight);

  const canvasWidth = Math.max(boardWidth, MIN_CANVAS_WIDTH);
  const boardOffsetX = (canvasWidth - boardWidth) / 2;

  // pad*1.3 clears most of each tab with a bit to spare, without reserving
  // a full tab's width on *both* neighbors (which was overkill and, at low
  // piece counts, left room for fewer columns than the board itself has).
  const cellWidth = pieceWidth + pad * 1.3;
  const cellHeight = pieceHeight + pad * 1.3;

  // Never go narrower than the board's own column count — that's the
  // proven-safe default. Only go *wider* than that, and only when the
  // canvas has room to spare (a portrait/narrow board widened above),
  // which is what actually needs the extra columns.
  const trayCols = Math.max(cols, Math.floor(canvasWidth / cellWidth));
  const trayRows = Math.max(1, Math.ceil(totalPieces / trayCols));

  const gap = Math.max(28, pieceHeight * 0.3);
  const trayTop = boardHeight + gap;
  const trayHeight = trayRows * cellHeight + gap;

  return {
    pieceWidth,
    pieceHeight,
    canvasWidth,
    boardOffsetX,
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
  // Jitter stays well inside each cell's own slack (the padding added for
  // tabs) so it can't push a piece into its neighbor's territory.
  const jitterX = Math.min(layout.pieceWidth * 0.08, (layout.cellWidth - layout.pieceWidth) * 0.3);
  const jitterY = Math.min(layout.pieceHeight * 0.08, (layout.cellHeight - layout.pieceHeight) * 0.3);

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
