"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
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
  containerRef: RefObject<HTMLDivElement | null>;
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
  containerRef,
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
  // Not a delta from a fixed starting point — an *offset* (where within the
  // piece you grabbed it, in board-space). Every move re-measures the
  // container's current on-screen box and re-derives the piece's position
  // from that plus this offset, so the drag is immune to the container
  // itself shifting mid-gesture (a banner above the board disappearing, a
  // widget loading in, the fit-to-screen scale recomputing) — those used to
  // make the piece jump, since accumulating a delta from a stale reference
  // point silently bakes in whatever the container moved by too.
  const grabOffset = useRef({ x: 0, y: 0 });
  const wasLockedRef = useRef(piece.locked);

  const blocked = !interactive || piece.locked || Boolean(heldByColor);
  const targetX = piece.col * pieceWidth;
  const targetY = piece.row * pieceHeight;

  // A drag's visual position lives in local state so it renders instantly
  // and never depends on a parent re-render round-trip; once the parent's
  // committed piece.x/y catches up to where we released, we hand rendering
  // back to the prop (e.g. so a later remote move of this piece is picked up).
  useEffect(() => {
    if (!dragging && dragPos && Math.abs(piece.x - dragPos.x) < 0.5 && Math.abs(piece.y - dragPos.y) < 0.5) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDragPos(null);
    }
  }, [piece.x, piece.y, dragPos, dragging]);

  useEffect(() => {
    const wasLocked = wasLockedRef.current;
    wasLockedRef.current = piece.locked;
    if (!wasLocked && piece.locked) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 380);
      return () => clearTimeout(t);
    }
  }, [piece.locked]);

  function computePos(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: piece.x, y: piece.y };
    const boardX = (e.clientX - rect.left) / scale;
    const boardY = (e.clientY - rect.top) / scale;
    return {
      x: clamp(boardX + grabOffset.current.x, minX, maxX),
      y: clamp(boardY + grabOffset.current.y, minY, maxY),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (blocked) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const boardX = (e.clientX - rect.left) / scale;
    const boardY = (e.clientY - rect.top) / scale;
    grabOffset.current = { x: piece.x - boardX, y: piece.y - boardY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDragPos({ x: piece.x, y: piece.y });
    onGrab(pieceKey);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const pos = computePos(e);
    setDragPos(pos);
    setNearTarget(Math.hypot(pos.x - targetX, pos.y - targetY) < snapThreshold);
    onMove(pieceKey, pos.x, pos.y);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
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

  // Clamped even outside a drag: a piece's stored x/y can predate the
  // current canvas (e.g. scattered under the beside-the-board tray
  // arrangement, then viewed on a narrow screen using the below-the-board
  // one) — clamping keeps it inside whatever canvas is actually showing
  // instead of rendering off in space.
  const pos = dragPos ?? { x: clamp(piece.x, minX, maxX), y: clamp(piece.y, minY, maxY) };
  const boxSize = { width: pieceWidth + pad * 2, height: pieceHeight + pad * 2 };

  const strokeColor = heldByColor ?? (nearTarget ? "#22c55e" : "rgba(255,255,255,0.9)");
  const strokeWidth = piece.locked ? 0 : nearTarget ? 3 : heldByColor ? 2.5 : 1.5;

  return (
    // The interactive, positioned element is a plain div; the svg inside it
    // is purely visual and never itself positioned or measured.
    <div
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
        width: boxSize.width,
        height: boxSize.height,
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
      <svg width={boxSize.width} height={boxSize.height} viewBox={`0 0 ${boxSize.width} ${boxSize.height}`}>
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
    </div>
  );
}
