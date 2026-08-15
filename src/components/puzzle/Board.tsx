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
  const { pieceWidth, pieceHeight, totalHeight, canvasWidth, boardOffsetX } = layout;
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

    // Prefer fitting both dimensions — dragging a piece from the tray up
    // onto the board is one continuous gesture, and the page never
    // auto-scrolls mid-drag, so ideally the whole board+tray fits on
    // screen. But that goal loses to pieces staying legible: at 100+
    // pieces (Difícil/Experto), especially on a tall image, shrinking to
    // fit height makes them illegibly small. Below that floor we accept
    // a scroll to reach the tray — every real jigsaw site has the same
    // tradeoff at high piece counts.
    function recomputeScale() {
      if (!el) return;
      const width = el.getBoundingClientRect().width;
      if (!width) return;
      const availableHeight = window.innerHeight - el.getBoundingClientRect().top - 64;
      const widthScale = width / canvasWidth;
      const heightScale = Math.max(availableHeight, 100) / totalHeight;
      const minUsableScale = Math.min(widthScale, 56 / Math.min(pieceWidth, pieceHeight));
      const fitScale = Math.min(widthScale, heightScale);
      setScale(Math.min(1.3, Math.max(0.15, Math.max(fitScale, minUsableScale))));
    }

    const observer = new ResizeObserver(recomputeScale);
    observer.observe(el);
    window.addEventListener("resize", recomputeScale);
    recomputeScale();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputeScale);
    };
  }, [canvasWidth, totalHeight, pieceWidth, pieceHeight]);

  const minX = -pieceWidth * 0.4;
  const maxX = canvasWidth - pieceWidth * 0.6;
  const minY = -pieceHeight * 0.4;
  const maxY = totalHeight - pieceHeight * 0.6;

  const lockedCount = Object.values(pieces).filter((p) => p.locked).length;
  const totalCount = rows * cols;

  return (
    <>
      <HintCard imageUrl={imageUrl} />
      <div ref={outerRef} className="w-full overflow-x-auto">
        <div style={{ width: canvasWidth * scale, height: totalHeight * scale }} className="relative mx-auto">
          <div
            style={{
              width: canvasWidth,
              height: totalHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {/* One continuous work surface — the target outline is just a
                faint guide, pieces are scattered loosely around/below it
                rather than sorted into a separate tray. */}
            <div
              className="absolute inset-0 rounded-2xl border border-neutral-200 bg-white/60 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70"
              style={{ width: canvasWidth, height: totalHeight, pointerEvents: "none" }}
            />
            <div
              data-testid="solution-area"
              className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-500/70 dark:bg-violet-500/10"
              style={{
                position: "absolute",
                top: 0,
                left: boardOffsetX,
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
              style={{ top: 10, left: boardOffsetX + 10, zIndex: 9999 }}
            >
              <Puzzle size={13} strokeWidth={2} />
              {lockedCount}/{totalCount} piezas
            </div>

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
                  boardOffsetX={boardOffsetX}
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
