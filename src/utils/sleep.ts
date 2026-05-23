/**
 * Async sleep utility.
 */

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 * Used to enforce delays between message sends.
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
