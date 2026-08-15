"use client";

import { Puzzle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { computeTrayLayout } from "@/lib/puzzle/shuffle";
import { generateEdgeSigns, piecePathD, tabPadding } from "@/lib/puzzle/pieceShapes";
import type { RoomPieceState } from "@/lib/puzzle/types";
import { HintCard } from "./HintCard";
import { PuzzlePiece } from "./PuzzlePiece";

type Props = {
  seed: string;
  imageUrl: string;
  boardWidth: number;
  boardHeight: number;
  rows: number;
  cols: number;
  pieces: RoomPieceState;
  heldBy: Record<string, string>;
  colorByParticipant: Record<string, string>;
  interactive: boolean;
  onGrab: (pieceKey: string) => void;
  onMove: (pieceKey: string, x: number, y: number) => void;
  onRelease: (pieceKey: string, x: number, y: number, locked: boolean) => void;
};

export function Board({
  seed,
  imageUrl,
  boardWidth,
  boardHeight,
  rows,
  cols,
  pieces,
  heldBy,
  colorByParticipant,
  interactive,
  onGrab,
  onMove,
  onRelease,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const layout = useMemo(
    () => computeTrayLayout(rows, cols, boardWidth, boardHeight),
    [rows, cols, boardWidth, boardHeight]
  );
  const { pieceWidth, pieceHeight, canvasWidth, canvasHeight, trayLeft } = layout;
  const snapThreshold = Math.min(pieceWidth, pieceHeight) * 0.28;
  const pad = tabPadding(pieceWidth, pieceHeight);

  const pathByKey = useMemo(() => {
    const edges = generateEdgeSigns(rows, cols, seed);
    const map = new Map<string, string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        map.set(`${r}-${c}`, piecePathD(pieceWidth, pieceHeight, pad, edges[r][c]));
      }
    }
    return map;
  }, [rows, cols, seed, pieceWidth, pieceHeight, pad]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    // Prefer fitting both dimensions — dragging a piece from the tray onto
    // the board is one continuous gesture, and the page never auto-scrolls
    // mid-drag, so ideally the whole board+tray fits on screen. That goal
    // loses to pieces staying legible: at 100+ pieces, shrinking to fit
    // height makes them illegibly small. Below that floor we accept a
    // scroll to reach more of the tray — every real jigsaw site has the
    // same tradeoff at high piece counts. The board sitting *beside* the
    // tray (not above it) is what keeps it reachable even then.
    function recomputeScale() {
      if (!el) return;
      const width = el.getBoundingClientRect().width;
      if (!width) return;
      const availableHeight = window.innerHeight - el.getBoundingClientRect().top - 64;
      const widthScale = width / canvasWidth;
      const heightScale = Math.max(availableHeight, 100) / canvasHeight;
      // Always fit both dimensions — no scrolling to reach the tray, full
      // stop, even at 100+ pieces. That means pieces get smaller as piece
      // count climbs; a 0.12 floor only guards against a degenerate
      // near-zero scale, it's not a "stay legible" target anymore.
      const fitScale = Math.min(widthScale, heightScale);
      // Never upscale past the board's natural resolution — on a wide
      // screen that only blows up an already-large layout, it doesn't make
      // anything more usable.
      setScale(Math.min(1, Math.max(0.12, fitScale)));
    }

    const observer = new ResizeObserver(recomputeScale);
    observer.observe(el);
    // Also watch <body>: it's `el`'s own box that ResizeObserver reports
    // on, but a sibling above the board (the Spotify "now playing" card,
    // once its first fetch resolves and it renders content) shifts `el`
    // *down* the page without changing `el`'s own width/height — which
    // ResizeObserver wouldn't otherwise notice, leaving the scale computed
    // against a stale, too-generous available-height reading.
    observer.observe(document.body);
    window.addEventListener("resize", recomputeScale);
    recomputeScale();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputeScale);
    };
  }, [canvasWidth, canvasHeight, pieceWidth, pieceHeight]);

  const minX = -pieceWidth * 0.4;
  const maxX = canvasWidth - pieceWidth * 0.6;
  const minY = -pieceHeight * 0.4;
  const maxY = canvasHeight - pieceHeight * 0.6;

  const lockedCount = Object.values(pieces).filter((p) => p.locked).length;
  const totalCount = rows * cols;

  return (
    <>
      <HintCard imageUrl={imageUrl} />
      <div ref={outerRef} className="w-full overflow-x-auto">
        <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }} className="relative mx-auto">
          <div
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {/* One continuous work surface — the target outline is just a
                faint guide, pieces are scattered loosely beside it rather
                than sorted into a visually separate tray. */}
            <div
              className="absolute inset-0 rounded-2xl border border-neutral-200 bg-white/60 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70"
              style={{ width: canvasWidth, height: canvasHeight, pointerEvents: "none" }}
            />
            <div
              data-testid="solution-area"
              className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-500/70 dark:bg-violet-500/10"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: boardWidth,
                height: boardHeight,
                backgroundImage:
                  `repeating-linear-gradient(to right, var(--puzzle-grid-line) 0 1px, transparent 1px ${pieceWidth}px), ` +
                  `repeating-linear-gradient(to bottom, var(--puzzle-grid-line) 0 1px, transparent 1px ${pieceHeight}px)`,
                pointerEvents: "none",
              }}
            />
            <div
              className="pointer-events-none absolute inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow"
              style={{ top: 10, left: 10, zIndex: 9999 }}
            >
              <Puzzle size={13} strokeWidth={2} />
              {lockedCount}/{totalCount} piezas
            </div>

            {/* A thin divider marks where the piece tray starts. */}
            <div
              className="pointer-events-none absolute border-l border-dashed border-neutral-300 dark:border-neutral-700"
              style={{ left: trayLeft - layout.gap / 2, top: 0, height: canvasHeight }}
            />

            {Object.entries(pieces).map(([key, piece]) => {
              const holder = heldBy[key];
              const pathD = pathByKey.get(key);
              if (!pathD) return null;
              return (
                <PuzzlePiece
                  key={key}
                  pieceKey={key}
                  piece={piece}
                  pathD={pathD}
                  pieceWidth={pieceWidth}
                  pieceHeight={pieceHeight}
                  pad={pad}
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
                  imageUrl={imageUrl}
                  scale={scale}
                  minX={minX}
                  maxX={maxX}
                  minY={minY}
                  maxY={maxY}
                  snapThreshold={snapThreshold}
                  interactive={interactive}
                  heldByColor={holder ? (colorByParticipant[holder] ?? "#9ca3af") : null}
                  onGrab={onGrab}
                  onMove={onMove}
                  onRelease={onRelease}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
