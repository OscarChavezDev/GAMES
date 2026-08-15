"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PieceState } from "@/lib/puzzle/types";

type Props = {
  pieceKey: string;
  piece: PieceState;
  pathD: string;
  pieceWidth: number;
  pieceHeight: number;
  pad: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PuzzlePiece({
  pieceKey,
  piece,
  pathD,
  pieceWidth,
  pieceHeight,
  pad,
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [nearTarget, setNearTarget] = useState(false);
  const [popping, setPopping] = useState(false);
  const dragOrigin = useRef({ clientX: 0, clientY: 0, pieceX: 0, pieceY: 0 });
  const wasLockedRef = useRef(piece.locked);

  const blocked = !interactive || piece.locked || Boolean(heldByColor);
  const targetX = piece.col * pieceWidth;
  const targetY = piece.row * pieceHeight;

  // A drag's visual position lives in local state so it renders instantly
  // and never depends on a parent re-render round-trip; once the parent's
  // committed piece.x/y catches up to where we released, we hand rendering
  // back to the prop (e.g. so a later remote move of this piece is picked up).
  useEffect(() => {
    if (dragPos && Math.abs(piece.x - dragPos.x) < 0.5 && Math.abs(piece.y - dragPos.y) < 0.5) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDragPos(null);
    }
  }, [piece.x, piece.y, dragPos]);

  useEffect(() => {
    const wasLocked = wasLockedRef.current;
    wasLockedRef.current = piece.locked;
    if (!wasLocked && piece.locked) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 380);
      return () => clearTimeout(t);
    }
  }, [piece.locked]);

  function computePos(e: ReactPointerEvent<SVGSVGElement>) {
    const dx = (e.clientX - dragOrigin.current.clientX) / scale;
    const dy = (e.clientY - dragOrigin.current.clientY) / scale;
    return {
      x: clamp(dragOrigin.current.pieceX + dx, minX, maxX),
      y: clamp(dragOrigin.current.pieceY + dy, minY, maxY),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (blocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { clientX: e.clientX, clientY: e.clientY, pieceX: piece.x, pieceY: piece.y };
    setDragging(true);
    setDragPos({ x: piece.x, y: piece.y });
    onGrab(pieceKey);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const pos = computePos(e);
    setDragPos(pos);
    setNearTarget(Math.hypot(pos.x - targetX, pos.y - targetY) < snapThreshold);
    onMove(pieceKey, pos.x, pos.y);
  }

  function handlePointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    setNearTarget(false);

    const pos = computePos(e);
    const locked = Math.hypot(pos.x - targetX, pos.y - targetY) < snapThreshold;
    const final = locked ? { x: targetX, y: targetY } : pos;
    setDragPos(final);
    onRelease(pieceKey, final.x, final.y, locked);
  }

  const pos = dragPos ?? { x: piece.x, y: piece.y };
  const boxSize = { width: pieceWidth + pad * 2, height: pieceHeight + pad * 2 };

  const strokeColor = heldByColor ?? (nearTarget ? "#22c55e" : "rgba(255,255,255,0.9)");
  const strokeWidth = piece.locked ? 0 : nearTarget ? 3 : heldByColor ? 2.5 : 1.5;

  return (
    <svg
      width={boxSize.width}
      height={boxSize.height}
      viewBox={`0 0 ${boxSize.width} ${boxSize.height}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-piece-key={pieceKey}
      data-piece-locked={piece.locked}
      style={{
        position: "absolute",
        left: pos.x - pad,
        top: pos.y - pad,
        zIndex: piece.z,
        touchAction: "none",
        cursor: blocked ? (piece.locked ? "default" : "not-allowed") : dragging ? "grabbing" : "grab",
        filter: piece.locked
          ? "none"
          : `drop-shadow(0 ${dragging ? 9 : 3}px ${dragging ? 16 : 6}px rgba(0,0,0,${dragging ? 0.45 : 0.3}))`,
        transform: popping ? "scale(1.07)" : "scale(1)",
        transformOrigin: "center",
        transition: dragging ? "none" : "transform 200ms ease, filter 150ms ease",
      }}
    >
      <defs>
        <clipPath id={`clip-${pieceKey}`}>
          <path d={pathD} />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${pieceKey})`}>
        <image
          href={imageUrl}
          x={pad - piece.col * pieceWidth}
          y={pad - piece.row * pieceHeight}
          width={boardWidth}
          height={boardHeight}
          preserveAspectRatio="none"
        />
      </g>
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}
