/**
 * Delay configuration service.
 * Provides default config, random delay generation, delay enforcement,
 * and config validation for the WhatsApp broadcasting application.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { AppConfig } from "@/types";

// ============================================================
// Default configuration
// ============================================================

/**
 * Default application configuration.
 * - delayMin / delayMax: 20–40 second window between sends (Requirements 7.1, 7.2)
 * - maxRetries: up to 3 automatic retry attempts (Requirement 7.3)
 * - logLevel: informational logging by default (Requirement 7.4)
 */
export const DEFAULT_CONFIG: AppConfig = {
  delayMin: 20000,
  delayMax: 40000,
  maxRetries: 3,
  logLevel: "info",
};

// ============================================================
// Delay helpers
// ============================================================

/**
 * Returns a random integer delay in milliseconds between min and max (inclusive).
 * Used to randomise the inter-message delay so sends appear more human-like.
 *
 * @param min - Minimum delay in milliseconds
 * @param max - Maximum delay in milliseconds
 * @returns A random integer in [min, max]
 */
export function getRandomDelay(min: number, max: number): number {
  if (min > max) {
    throw new RangeError(
      `getRandomDelay: min (${min}) must not be greater than max (${max})`
    );
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a promise that resolves after the specified delay.
 * Wraps setTimeout so callers can simply `await enforceDelay(ms)`.
 *
 * @param delayMs - Duration to wait in milliseconds
 */
export function enforceDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

// ============================================================
// Validation
// ============================================================

/**
 * Validates a partial AppConfig object.
 * Returns true only when every supplied field satisfies the business rules:
 *  - delayMin >= 0
 *  - delayMax >= delayMin (when both are present)
 *  - maxRetries is a non-negative integer
 *  - logLevel is one of the accepted values
 *
 * @param config - Partial config to validate
 * @returns true if the config is valid, false otherwise
 */
export function validateDelayConfig(config: Partial<AppConfig>): boolean {
  const validLogLevels = ["debug", "info", "warn", "error"] as const;

  if (config.delayMin !== undefined) {
    if (!Number.isFinite(config.delayMin) || config.delayMin < 0) {
      return false;
    }
  }

  if (config.delayMax !== undefined) {
    if (!Number.isFinite(config.delayMax) || config.delayMax < 0) {
      return false;
    }
  }

  // When both are present, max must be >= min
  if (
    config.delayMin !== undefined &&
    config.delayMax !== undefined &&
    config.delayMax < config.delayMin
  ) {
    return false;
  }

  if (config.maxRetries !== undefined) {
    if (
      !Number.isInteger(config.maxRetries) ||
      config.maxRetries < 0
    ) {
      return false;
    }
  }

  if (config.logLevel !== undefined) {
    if (!(validLogLevels as readonly string[]).includes(config.logLevel)) {
      return false;
    }
  }

  return true;
}
