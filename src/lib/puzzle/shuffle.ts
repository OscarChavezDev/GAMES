import { tabPadding } from "./pieceShapes";
import { pieceKey, type RoomPieceState } from "./types";

export type TrayLayout = {
  pieceWidth: number;
  pieceHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  trayLeft: number;
  trayTop: number;
  trayCols: number;
  trayRows: number;
  cellWidth: number;
  cellHeight: number;
  trayWidth: number;
  trayHeight: number;
  gap: number;
  vertical: boolean;
};

const MIN_TRAY_COLS = 4;
const MAX_TRAY_COLS = 26;

/**
 * Single source of truth for where the "tray" (the shelf of unplaced
 * pieces) sits and how big it is. Both the initial piece shuffle
 * (server-side, at room creation) and the Board component's layout math
 * call this, so they can never disagree about the coordinate space.
 *
 * `vertical` picks between the two arrangements: tray *beside* the board
 * (targeting a tray about as tall as the board, growing wider with piece
 * count) for wide/landscape viewports, or tray *below* the board (targeting
 * a tray about as wide as the board, growing taller with piece count) for
 * narrow/portrait ones. A single fixed arrangement can't serve both well —
 * the beside-layout's canvas is inherently 2-3x wider than the board no
 * matter the piece count, which is fine on a wide screen but forces a tiny
 * scale on a narrow phone (leaving most of its height unused). Board decides
 * which to use from its own viewport at render time; each piece's absolute
 * x/y is still clamped into whichever canvas is currently showing, so a
 * piece scattered under one arrangement never renders outside the other.
 *
 * Cells are sized to clear each piece's tabs on every side (not just its
 * base rectangle), so neighbors' tabs don't visually collide — a zero-gap
 * grid looked fine at 16 pieces but turned into a solid jumble at 100+.
 */
export function computeTrayLayout(
  rows: number,
  cols: number,
  boardWidth: number,
  boardHeight: number,
  vertical = false
): TrayLayout {
  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;
  const totalPieces = rows * cols;
  const pad = tabPadding(pieceWidth, pieceHeight);

  // pad*1.5 clears most of each tab with a bit to spare, without reserving
  // a full tab's width on *both* neighbors. Each piece's own draggable div
  // is pieceWidth+pad*2 wide (room for its own tabs on both sides), wider
  // than one cell slot — some overlap between neighboring cells' hit areas
  // is inherent to keeping the tray compact, but too little slack here made
  // that overlap large enough to occasionally steal clicks/drags meant for
  // the piece underneath, especially once pieces render small.
  const cellWidth = pieceWidth + pad * 1.5;
  const cellHeight = pieceHeight + pad * 1.5;
  const gap = Math.max(28, Math.min(pieceWidth, pieceHeight) * 0.3);

  if (vertical) {
    // The tray below the board can be noticeably wider than the board
    // itself (a phone is tall, not square) — capping it at exactly
    // boardWidth forced too many rows at higher piece counts, ballooning
    // canvasHeight and shrinking the fit-to-screen scale far more than the
    // viewport's actual aspect ratio warranted.
    const targetTrayCols = Math.max(1, Math.round((boardWidth * 1.7) / cellWidth));
    const trayCols = Math.min(
      MAX_TRAY_COLS,
      Math.max(MIN_TRAY_COLS, targetTrayCols)
    );
    const trayRows = Math.max(1, Math.ceil(totalPieces / trayCols));
    const trayWidth = trayCols * cellWidth;
    const trayHeight = trayRows * cellHeight;
    const trayTop = boardHeight + gap;

    return {
      pieceWidth,
      pieceHeight,
      canvasWidth: Math.max(boardWidth, trayWidth),
      canvasHeight: trayTop + trayHeight,
      trayLeft: 0,
      trayTop,
      trayCols,
      trayRows,
      cellWidth,
      cellHeight,
      trayWidth,
      trayHeight,
      gap,
      vertical: true,
    };
  }

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
  const trayLeft = boardWidth + gap;

  return {
    pieceWidth,
    pieceHeight,
    canvasWidth: trayLeft + trayWidth,
    canvasHeight: Math.max(boardHeight, trayHeight),
    trayLeft,
    trayTop: 0,
    trayCols,
    trayRows,
    cellWidth,
    cellHeight,
    trayWidth,
    trayHeight,
    gap,
    vertical: false,
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
    const baseY = layout.trayTop + trayRow * layout.cellHeight + (layout.cellHeight - layout.pieceHeight) / 2;

    state[pieceKey(row, col)] = {
      row,
      col,
      x: Math.max(layout.trayLeft, baseX + (Math.random() * 2 - 1) * jitterX),
      y: Math.max(layout.trayTop, baseY + (Math.random() * 2 - 1) * jitterY),
      locked: false,
      z: slot + 1,
    };
  });

  return state;
}
