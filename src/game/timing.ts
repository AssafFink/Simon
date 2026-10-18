// Presentation pace from DESIGN.md §1.1; identical for every round (no speed-up).
export const LEAD_IN_MS = 1000;
export const FLASH_MS = 600;
export const GAP_MS = 250;
export const PRESS_MIN_MS = 300;
// After a completed round: keep the finished round number on screen this long,
// then reveal the next one and wait LEAD_IN_MS before its first color.
export const ROUND_PAUSE_MS = 1000;
// Pause between the game-ending press (win or loss) and the result message.
export const RESULT_DELAY_MS = 1000;
