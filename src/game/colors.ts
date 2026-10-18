export type SimonColor = 'green' | 'red' | 'yellow' | 'blue';

export type BoardPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ColorInfo = {
  id: SimonColor;
  label: string;
  position: BoardPosition;
};

// Spatial layout from the mockups; must not flip under RTL.
export const COLORS: readonly ColorInfo[] = [
  { id: 'green', label: 'ירוק', position: 'top-left' },
  { id: 'red', label: 'אדום', position: 'top-right' },
  { id: 'yellow', label: 'צהוב', position: 'bottom-left' },
  { id: 'blue', label: 'כחול', position: 'bottom-right' },
];

export const TOTAL_ROUNDS = 10;
