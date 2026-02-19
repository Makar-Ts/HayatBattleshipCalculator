import { clamp } from "./clamp.js";

export function generateProgressbar(cur, min, max, maxSquares = 25, options = { block: '█', empty: '&nbsp;' }) {
  const val01 = clamp((cur - min) / (max - min), 0, 1);
  const amount = Math.floor(val01 * maxSquares);

  return `|${options.block.repeat(amount)}${options.empty.repeat(maxSquares - amount)}|`;
};
