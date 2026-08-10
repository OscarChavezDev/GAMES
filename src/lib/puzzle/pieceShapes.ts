export type EdgeSign = -1 | 0 | 1;

export type PieceEdges = {
  top: EdgeSign;
  right: EdgeSign;
  bottom: EdgeSign;
  left: EdgeSign;
};

function mulberry32(seed: number) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Assigns a tab (+1) or blank (-1) to every interior grid boundary, shared
 * between the two pieces on either side of it, then derives each piece's
 * own 4 edge signs from those shared boundaries. This is what makes
 * neighboring pieces interlock: a piece's tab is always the same physical
 * curve as its neighbor's matching notch, just read from either side.
 * Outer-border edges are flat (0). Deterministic per `seed` so every
 * client in a room computes the identical cut.
 */
export function generateEdgeSigns(rows: number, cols: number, seed: string): PieceEdges[][] {
  const random = mulberry32(seedFromString(seed));

  // H[r][c]: boundary between piece (r,c) and (r,c+1). +1 = the left piece
  // (r,c) owns a tab poking right into its neighbor.
  const H: EdgeSign[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: EdgeSign[] = [];
    for (let c = 0; c < cols - 1; c++) row.push(random() < 0.5 ? -1 : 1);
    H.push(row);
  }

  // V[r][c]: boundary between piece (r,c) and (r+1,c). +1 = the top piece
  // (r,c) owns a tab poking down into its neighbor.
  const V: EdgeSign[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    const row: EdgeSign[] = [];
    for (let c = 0; c < cols; c++) row.push(random() < 0.5 ? -1 : 1);
    V.push(row);
  }

  const result: PieceEdges[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: PieceEdges[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        top: r > 0 ? ((-V[r - 1][c]) as EdgeSign) : 0,
        right: c < cols - 1 ? H[r][c] : 0,
        bottom: r < rows - 1 ? V[r][c] : 0,
        left: c > 0 ? ((-H[r][c - 1]) as EdgeSign) : 0,
      });
    }
    result.push(row);
  }
  return result;
}

type Pt = readonly [number, number];

function edgeCommand(a: Pt, b: Pt, outward: Pt, sign: EdgeSign, amp: number): string {
  if (sign === 0) return `L ${b[0]} ${b[1]}`;

  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const d = sign * amp;
  const at = (t: number, dd: number): Pt => [a[0] + ux * t + outward[0] * dd, a[1] + uy * t + outward[1] * dd];

  const leadIn = at(0.2, 0);
  const c1 = at(0.28, d);
  const c2 = at(0.32, d);
  const peak = at(0.5, d);
  const c3 = at(0.68, d);
  const c4 = at(0.72, d);
  const leadOut = at(0.8, 0);

  return (
    `L ${leadIn[0]} ${leadIn[1]} ` +
    `C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${peak[0]} ${peak[1]} ` +
    `C ${c3[0]} ${c3[1]} ${c4[0]} ${c4[1]} ${leadOut[0]} ${leadOut[1]} ` +
    `L ${b[0]} ${b[1]}`
  );
}

/**
 * SVG path `d` for one piece's interlocking silhouette, in local coordinates
 * where (pad, pad) is the true grid cell's top-left corner — i.e. the path
 * lives inside a (pieceWidth + 2*pad) x (pieceHeight + 2*pad) box so tabs
 * that bulge outward have room to render without clipping.
 */
export function piecePathD(
  pieceWidth: number,
  pieceHeight: number,
  pad: number,
  edges: PieceEdges
): string {
  const tl: Pt = [pad, pad];
  const tr: Pt = [pad + pieceWidth, pad];
  const br: Pt = [pad + pieceWidth, pad + pieceHeight];
  const bl: Pt = [pad, pad + pieceHeight];

  const amp = pad * 0.82;

  const top = edgeCommand(tl, tr, [0, -1], edges.top, amp);
  const right = edgeCommand(tr, br, [1, 0], edges.right, amp);
  const bottom = edgeCommand(br, bl, [0, 1], edges.bottom, amp);
  const left = edgeCommand(bl, tl, [-1, 0], edges.left, amp);

  return `M ${tl[0]} ${tl[1]} ${top} ${right} ${bottom} ${left} Z`;
}

/** How far a tab can bulge past the piece's base cell — size the piece's SVG box with this. */
export function tabPadding(pieceWidth: number, pieceHeight: number): number {
  return Math.min(pieceWidth, pieceHeight) * 0.24;
}
