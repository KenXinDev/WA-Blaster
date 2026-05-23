/**
 * Core TypeScript interfaces and enums for the WhatsApp Broadcasting Application.
 * These definitions cover all data models used throughout the application.
 */

// ============================================================
// Enums
// ============================================================

/** Connection states for a WhatsApp account */
export enum WhatsAppStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  QR_READY = "QR_READY",
}

/** Lifecycle states for a broadcast message operation */
export enum MessageStatus {
  PENDING = "PENDING",
  SENDING = "SENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

/** Delivery outcome for a single recipient */
export enum DeliveryStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

// ============================================================
// User
// ============================================================

/**
 * Represents an authenticated user of the application.
 * Users authenticate via Google OAuth.
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's profile picture URL */
  image: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Record last update timestamp */
  updatedAt: Date;
}

// ============================================================
// WhatsApp Account
// ============================================================

/**
 * Represents a WhatsApp account linked to a user.
 * Each account corresponds to a unique WhatsApp phone number.
 */
export interface WhatsAppAccount {
  /** Unique account ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** WhatsApp phone number in international format (e.g. 6281234567890) */
  phoneNumber: string;
  /** Human-readable display name for the account */
  displayName: string;
  /** Current connection status */
  status: WhatsAppStatus;
  /** AES-256-GCM encrypted session data */
  sessionData: string | null;
  /** Record creation timestamp */
  createdAt: Date;
  /** Record last update timestamp */
  updatedAt: Date;
}

// ============================================================
// Excel File
// ============================================================

/**
 * Represents an uploaded and parsed Excel file.
 * Stores metadata about the file and the extracted phone numbers.
 */
export interface ExcelFile {
  /** Unique file ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Original file name as uploaded by the user */
  fileName: string;
  /** Server-side stored file path */
  filePath: string;
  /** Column names extracted from the file header row */
  columns: string[];
  /** Total number of data rows (excluding header) */
  rowCount: number;
  /** Record creation timestamp */
  createdAt: Date;
}

// ============================================================
// Message Template
// ============================================================

/**
 * Represents a reusable message template with optional placeholder variables.
 * Placeholders are denoted as {variableName} and replaced with Excel column values.
 */
export interface MessageTemplate {
  /** Unique template ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Message content, may contain {placeholder} variables */
  content: string;
  /** List of placeholder names extracted from the content */
  placeholders: string[];
  /** Record creation timestamp */
  createdAt: Date;
  /** Record last update timestamp */
  updatedAt: Date;
}

// ============================================================
// Message History
// ============================================================

/**
 * Represents a record of a broadcast message session.
 * Tracks aggregate statistics for a single broadcast operation.
 */
export interface MessageHistory {
  /** Unique history ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** WhatsApp account ID used for sending */
  whatsappAccountId: string;
  /** Used message template ID, null if no template was used */
  templateId: string | null;
  /** Source Excel file ID */
  excelFileId: string;
  /** Total number of intended recipients */
  totalRecipients: number;
  /** Number of messages successfully sent */
  successCount: number;
  /** Number of messages that failed to send */
  failureCount: number;
  /** Current broadcast status */
  status: MessageStatus;
  /** Timestamp when the broadcast started */
  startedAt: Date;
  /** Timestamp when the broadcast completed, null if still in progress */
  completedAt: Date | null;
}

// ============================================================
// Delivery Result
// ============================================================

/**
 * Represents the delivery result for a single recipient in a broadcast.
 * One DeliveryResult is created per phone number per broadcast.
 */
export interface DeliveryResult {
  /** Unique result ID */
  id: string;
  /** Parent MessageHistory record ID */
  historyId: string;
  /** Recipient phone number in international format */
  phoneNumber: string;
  /** Delivery outcome */
  status: DeliveryStatus;
  /** Error message if delivery failed, null otherwise */
  errorMessage: string | null;
  /** Timestamp when the message was sent, null if not yet sent */
  sentAt: Date | null;
}

// ============================================================
// App Config
// ============================================================

/** Supported log levels for the application logger */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Application configuration controlling rate limiting, retry behaviour, and logging.
 */
export interface AppConfig {
  /** Minimum delay in milliseconds between consecutive message sends */
  delayMin: number;
  /** Maximum delay in milliseconds between consecutive message sends */
  delayMax: number;
  /** Maximum number of retry attempts for a failed message send */
  maxRetries: number;
  /** Application log level */
  logLevel: LogLevel;
}

// ============================================================
// API Response helpers
// ============================================================

/**
 * Generic API success response wrapper.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Generic API error response wrapper.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Union type for all API responses */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// Excel parsing helpers
// ============================================================

/**
 * Represents a single row of data extracted from an Excel file.
 * Keys are column names, values are the cell contents as strings.
 */
export type ExcelRow = Record<string, string>;

/**
 * Result of parsing an Excel file.
 */
export interface ExcelParseResult {
  /** All column names found in the header row */
  columns: string[];
  /** All rows of data extracted from the file */
  rows: ExcelRow[];
  /** Total number of data rows (excluding header) */
  totalRows: number;
  /** Phone numbers that passed validation */
  validPhoneNumbers: string[];
  /** Phone numbers that failed validation */
  invalidPhoneNumbers: string[];
}

// ============================================================
// Message sending helpers
// ============================================================

/**
 * Payload for initiating a broadcast message send operation.
 */
export interface SendMessagePayload {
  /** ID of the WhatsApp account to send from */
  accountId: string;
  /** ID of the parsed Excel file containing recipients */
  excelFileId: string;
  /** Message content, may contain {placeholder} variables */
  messageContent: string;
  /** Optional template ID if a saved template is being used */
  templateId?: string;
  /** Delay in milliseconds between each message (overrides config default) */
  delayMs?: number;
}

/**
 * Real-time progress update for an ongoing broadcast operation.
 */
export interface BroadcastProgress {
  /** Parent history record ID */
  historyId: string;
  /** Total number of recipients */
  total: number;
  /** Number of messages sent so far */
  sent: number;
  /** Number of messages that have failed so far */
  failed: number;
  /** Current broadcast status */
  status: MessageStatus;
}
