import { tabPadding } from "./pieceShapes";
import { pieceKey, type RoomPieceState } from "./types";

export type TrayLayout = {
  pieceWidth: number;
  pieceHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  trayLeft: number;
  trayCols: number;
  trayRows: number;
  cellWidth: number;
  cellHeight: number;
  trayWidth: number;
  trayHeight: number;
  gap: number;
};

const MIN_TRAY_COLS = 4;
const MAX_TRAY_COLS = 26;

/**
 * Single source of truth for where the "tray" (the shelf of unplaced
 * pieces) sits and how big it is. Both the initial piece shuffle
 * (server-side, at room creation) and the Board component's layout math
 * call this, so they can never disagree about the coordinate space.
 *
 * The tray sits to the *right* of the board, not below it: dragging a
 * piece from the tray onto the board is one continuous gesture, and stacking
 * them meant reaching a piece near the bottom of a long tray required
 * scrolling the board itself out of view first. Side by side, the board
 * stays put — only the tray's own height grows with piece count.
 *
 * Cells are sized to clear each piece's tabs on every side (not just its
 * base rectangle), so neighbors' tabs don't visually collide — a zero-gap
 * grid looked fine at 16 pieces but turned into a solid jumble at 100+.
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

  // pad*1.3 clears most of each tab with a bit to spare, without reserving
  // a full tab's width on *both* neighbors.
  const cellWidth = pieceWidth + pad * 1.3;
  const cellHeight = pieceHeight + pad * 1.3;

  // Aim for a tray about as tall as the board itself, not a fixed pixel
  // width — a flat width budget meant a 192-piece puzzle and a 16-piece one
  // got the same column count, so the big one ended up with a tray many
  // times taller than the board (and, since Board fits both dimensions on
  // screen, a much smaller scale to compensate). Sizing columns off piece
  // count keeps the tray roughly square-ish beside the board at any
  // difficulty.
  const targetTrayRows = Math.max(1, Math.round(boardHeight / cellHeight));
  const trayCols = Math.min(
    MAX_TRAY_COLS,
    Math.max(MIN_TRAY_COLS, Math.ceil(totalPieces / targetTrayRows))
  );
  const trayRows = Math.max(1, Math.ceil(totalPieces / trayCols));
  const trayWidth = trayCols * cellWidth;
  const trayHeight = trayRows * cellHeight;

  const gap = Math.max(28, Math.min(pieceWidth, pieceHeight) * 0.3);
  const trayLeft = boardWidth + gap;

  return {
    pieceWidth,
    pieceHeight,
    canvasWidth: trayLeft + trayWidth,
    canvasHeight: Math.max(boardHeight, trayHeight),
    trayLeft,
    trayCols,
    trayRows,
    cellWidth,
    cellHeight,
    trayWidth,
    trayHeight,
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
 * across a tidy grid tray beside the board, each cell nudged with a small
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

    const baseX = layout.trayLeft + trayCol * layout.cellWidth + (layout.cellWidth - layout.pieceWidth) / 2;
    const baseY = trayRow * layout.cellHeight + (layout.cellHeight - layout.pieceHeight) / 2;

    state[pieceKey(row, col)] = {
      row,
      col,
      x: Math.max(layout.trayLeft, baseX + (Math.random() * 2 - 1) * jitterX),
      y: Math.max(0, baseY + (Math.random() * 2 - 1) * jitterY),
      locked: false,
      z: slot + 1,
    };
  });

  return state;
}
