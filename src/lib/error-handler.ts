/**
 * Error handling middleware for Next.js API routes.
 * Provides a structured AppError class, a catalogue of error codes,
 * a normalisation helper, and a higher-order wrapper for route handlers.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import type { NextApiRequest, NextApiResponse } from "next";

// ============================================================
// AppError
// ============================================================

/**
 * Structured application error that carries an error code and HTTP status code.
 * Throw this anywhere in the application to produce a consistent API error response.
 */
export class AppError extends Error {
  /** Machine-readable error code (e.g. "ERR_001") */
  readonly code: string;
  /** HTTP status code to return to the client */
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;

    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================
// Error codes catalogue
// ============================================================

/**
 * Catalogue of application-wide error codes.
 * Each entry maps a symbolic name to its string code.
 */
export const ERROR_CODES = {
  /** Generic / unclassified server error */
  INTERNAL_SERVER_ERROR: "ERR_001",
  /** Request body or query parameters failed validation */
  VALIDATION_ERROR: "ERR_002",
  /** The requested resource could not be found */
  NOT_FOUND: "ERR_003",
  /** The caller is not authenticated */
  UNAUTHORIZED: "ERR_004",
  /** The caller does not have permission to perform the action */
  FORBIDDEN: "ERR_005",
  /** WhatsApp account is not connected */
  WHATSAPP_NOT_CONNECTED: "ERR_006",
  /** The uploaded or referenced Excel file is invalid */
  INVALID_EXCEL_FILE: "ERR_007",
  /** Message sending failed */
  MESSAGE_SEND_FAILED: "ERR_008",
  /** Configuration is invalid */
  INVALID_CONFIG: "ERR_009",
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: "ERR_010",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// handleApiError
// ============================================================

/**
 * Normalises any thrown value into a structured error response object.
 * - AppError instances are mapped directly.
 * - Native Error instances are treated as internal server errors.
 * - Unknown values produce a generic internal server error.
 *
 * @param error - The caught error value
 * @returns Normalised error payload suitable for JSON serialisation
 */
export function handleApiError(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: "An unexpected error occurred",
    statusCode: 500,
  };
}

// ============================================================
// withErrorHandler
// ============================================================

type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Higher-order function that wraps a Next.js API route handler with
 * centralised error handling.
 *
 * Any error thrown inside the wrapped handler is caught, normalised via
 * handleApiError, and returned as a JSON error response so individual
 * handlers do not need their own try/catch blocks.
 *
 * @param handler - The Next.js API route handler to wrap
 * @returns A new handler that catches and formats errors automatically
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error: unknown) {
      const { code, message, statusCode } = handleApiError(error);

      // Only send a response if one hasn't been sent already
      if (!res.headersSent) {
        res.status(statusCode).json({
          success: false,
          error: { code, message },
        });
      }
    }
  };
}
