import type { Difficulty } from "./types";

export const DIFFICULTIES: Difficulty[] = [
  { id: "facil", label: "Fácil", rows: 4, cols: 4 },
  { id: "medio", label: "Medio", rows: 6, cols: 8 },
  { id: "dificil", label: "Difícil", rows: 9, cols: 12 },
  { id: "experto", label: "Experto", rows: 12, cols: 16 },
];

export function getDifficulty(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

export function pieceCount(d: Pick<Difficulty, "rows" | "cols">): number {
  return d.rows * d.cols;
}
