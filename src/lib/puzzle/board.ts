const MAX_BOARD_SIDE = 1200;

/**
 * Normalizes any source image into a design-space board size that both
 * players share as their drag/drop coordinate system. Keeping this
 * independent of the raw upload resolution means a 6000px photo and an
 * 800px photo both produce reasonably sized numbers, while still
 * preserving the image's aspect ratio exactly (so CSS background-size
 * never distorts a piece's crop).
 */
export function computeBoardSize(
  imageWidth: number,
  imageHeight: number,
  maxSide: number = MAX_BOARD_SIDE
): { boardWidth: number; boardHeight: number } {
  if (imageWidth >= imageHeight) {
    const boardWidth = Math.min(imageWidth, maxSide);
    const boardHeight = Math.max(1, Math.round(boardWidth * (imageHeight / imageWidth)));
    return { boardWidth, boardHeight };
  }
  const boardHeight = Math.min(imageHeight, maxSide);
  const boardWidth = Math.max(1, Math.round(boardHeight * (imageWidth / imageHeight)));
  return { boardWidth, boardHeight };
}
