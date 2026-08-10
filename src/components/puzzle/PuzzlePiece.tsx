"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PieceState } from "@/lib/puzzle/types";

type Props = {
  pieceKey: string;
  piece: PieceState;
  pieceWidth: number;
  pieceHeight: number;
  boardWidth: number;
  boardHeight: number;
  imageUrl: string;
  scale: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  snapThreshold: number;
  interactive: boolean;
  heldByColor: string | null;
  onGrab: (pieceKey: string) => void;
  onMove: (pieceKey: string, x: number, y: number) => void;
  onRelease: (pieceKey: string, x: number, y: number, locked: boolean) => void;
};

export function PuzzlePiece({
  pieceKey,
  piece,
  pieceWidth,
  pieceHeight,
  boardWidth,
  boardHeight,
  imageUrl,
  scale,
  minX,
  maxX,
  minY,
  maxY,
  snapThreshold,
  interactive,
  heldByColor,
  onGrab,
  onMove,
  onRelease,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ clientX: 0, clientY: 0, pieceX: 0, pieceY: 0 });

  const blocked = !interactive || piece.locked || Boolean(heldByColor);

  function computeBoardPos(e: ReactPointerEvent<HTMLDivElement>) {
    const deltaClientX = e.clientX - dragOrigin.current.clientX;
    const deltaClientY = e.clientY - dragOrigin.current.clientY;
    const x = dragOrigin.current.pieceX + deltaClientX / scale;
    const y = dragOrigin.current.pieceY + deltaClientY / scale;
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (blocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      pieceX: piece.x,
      pieceY: piece.y,
    };
    setDragging(true);
    onGrab(pieceKey);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const { x, y } = computeBoardPos(e);
    onMove(pieceKey, x, y);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);

    const { x, y } = computeBoardPos(e);
    const targetX = piece.col * pieceWidth;
    const targetY = piece.row * pieceHeight;
    const distance = Math.hypot(x - targetX, y - targetY);
    const locked = distance < snapThreshold;

    onRelease(pieceKey, locked ? targetX : x, locked ? targetY : y, locked);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: piece.x,
        top: piece.y,
        width: pieceWidth,
        height: pieceHeight,
        zIndex: piece.z,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: `${boardWidth}px ${boardHeight}px`,
        backgroundPosition: `-${piece.col * pieceWidth}px -${piece.row * pieceHeight}px`,
        touchAction: "none",
        boxSizing: "border-box",
        cursor: blocked ? (piece.locked ? "default" : "not-allowed") : dragging ? "grabbing" : "grab",
        border: piece.locked ? "none" : "1px solid rgba(255,255,255,0.55)",
        boxShadow: piece.locked
          ? "none"
          : heldByColor
            ? `0 0 0 2px ${heldByColor}, 0 6px 14px rgba(0,0,0,0.35)`
            : dragging
              ? "0 10px 20px rgba(0,0,0,0.4)"
              : "0 2px 5px rgba(0,0,0,0.25)",
        transition: dragging ? "none" : "box-shadow 120ms ease",
      }}
    />
  );
}
