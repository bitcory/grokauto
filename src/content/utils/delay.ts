/**
 * Random delay between min and max seconds
 */
export function randomDelay(minSec: number, maxSec: number): Promise<void> {
  const ms = (minSec + Math.random() * (maxSec - minSec)) * 1000;
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fixed delay in milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
