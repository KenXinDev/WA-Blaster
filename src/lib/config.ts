/**
 * Config parser and serializer.
 * Provides Zod-backed parsing, serialization, and type-guard validation
 * for the AppConfig object.
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { z } from "zod";
import type { AppConfig } from "@/types";

// ============================================================
// Zod schema
// ============================================================

/**
 * Zod schema for AppConfig.
 * Enforces:
 *  - delayMin / delayMax are non-negative numbers with max >= min
 *  - maxRetries is a non-negative integer
 *  - logLevel is one of the four accepted values
 */
export const CONFIG_SCHEMA = z
  .object({
    delayMin: z
      .number({ required_error: "delayMin is required" })
      .nonnegative("delayMin must be >= 0"),
    delayMax: z
      .number({ required_error: "delayMax is required" })
      .nonnegative("delayMax must be >= 0"),
    maxRetries: z
      .number({ required_error: "maxRetries is required" })
      .int("maxRetries must be an integer")
      .nonnegative("maxRetries must be >= 0"),
    logLevel: z.enum(["debug", "info", "warn", "error"], {
      required_error: "logLevel is required",
      invalid_type_error: 'logLevel must be one of: debug, info, warn, error',
    }),
  })
  .refine((data) => data.delayMax >= data.delayMin, {
    message: "delayMax must be greater than or equal to delayMin",
    path: ["delayMax"],
  });

// ============================================================
// Parse
// ============================================================

/**
 * Parses a JSON string into a validated AppConfig object.
 * Throws a descriptive error if the JSON is malformed or fails schema validation.
 *
 * @param json - Raw JSON string to parse
 * @returns Validated AppConfig
 * @throws Error if JSON is invalid or config fails validation
 */
export function parseConfig(json: string): AppConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("parseConfig: invalid JSON string");
  }

  const result = CONFIG_SCHEMA.safeParse(raw);
  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`parseConfig: validation failed — ${messages}`);
  }

  return result.data as AppConfig;
}

// ============================================================
// Serialize
// ============================================================

/**
 * Serializes an AppConfig object to a pretty-printed JSON string.
 *
 * @param config - AppConfig to serialize
 * @returns JSON string representation
 */
export function serializeConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

// ============================================================
// Type guard
// ============================================================

/**
 * Type guard that returns true when the supplied value is a valid AppConfig.
 * Uses the Zod schema for validation so the check is consistent with parseConfig.
 *
 * @param config - Unknown value to test
 * @returns true if config satisfies AppConfig, false otherwise
 */
export function validateConfig(config: unknown): config is AppConfig {
  return CONFIG_SCHEMA.safeParse(config).success;
}
