import { COLORS, type SimonColor } from './colors.ts';

// Kept in its own module so tests can replace it with a predictable sequence.
export function randomColor(): SimonColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
