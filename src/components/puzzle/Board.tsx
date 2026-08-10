"use client";

import { useEffect, useRef, useState } from "react";

import { boardWithTrayHeight } from "@/lib/puzzle/shuffle";
import type { RoomPieceState } from "@/lib/puzzle/types";
import { PuzzlePiece } from "./PuzzlePiece";

type Props = {
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

  const totalHeight = boardWithTrayHeight(boardHeight);
  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;
  const snapThreshold = Math.min(pieceWidth, pieceHeight) * 0.28;

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      const next = Math.min(1.3, Math.max(0.2, width / boardWidth));
      setScale(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [boardWidth]);

  const minX = -pieceWidth * 0.4;
  const maxX = boardWidth - pieceWidth * 0.6;
  const minY = -pieceHeight * 0.4;
  const maxY = totalHeight - pieceHeight * 0.6;

  return (
    <div ref={outerRef} className="w-full overflow-x-auto">
      <div style={{ width: boardWidth * scale, height: totalHeight * scale }} className="relative mx-auto">
        <div
          style={{
            width: boardWidth,
            height: totalHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Ghost preview of the target image, so players can see where pieces go. */}
          <div
            className="rounded-lg border border-dashed border-neutral-400/70 dark:border-neutral-600/70"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: boardWidth,
              height: boardHeight,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${boardWidth}px ${boardHeight}px`,
              opacity: 0.16,
              pointerEvents: "none",
            }}
          />

          {/* Scatter tray area, below the board. */}
          <div
            className="rounded-lg border border-dashed border-neutral-300/70 dark:border-neutral-700/70"
            style={{
              position: "absolute",
              top: boardHeight + 24,
              left: 0,
              width: boardWidth,
              height: totalHeight - boardHeight - 24,
              pointerEvents: "none",
            }}
          />

          {Object.entries(pieces).map(([key, piece]) => {
            const holder = heldBy[key];
            return (
              <PuzzlePiece
                key={key}
                pieceKey={key}
                piece={piece}
                pieceWidth={pieceWidth}
                pieceHeight={pieceHeight}
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
  );
}
