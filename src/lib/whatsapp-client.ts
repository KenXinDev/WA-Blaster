/**
 * WhatsApp client wrapper using whatsapp-web.js.
 * Provides WhatsAppClientWrapper for individual account management and
 * WhatsAppClientManager (singleton) for managing multiple client instances.
 *
 * Requirements: 2.2, 2.3, 2.4
 */

import { Client, LocalAuth, Message } from "whatsapp-web.js";
import QRCode from "qrcode";
import { WhatsAppStatus } from "@/types/index";

// ============================================================
// Types
// ============================================================

export interface ClientEventHandlers {
  onQR?: (qrDataUrl: string) => void;
  onReady?: () => void;
  onDisconnected?: (reason: string) => void;
  onAuthFailure?: (message: string) => void;
}

// ============================================================
// WhatsAppClientWrapper
// ============================================================

/**
 * Wraps a whatsapp-web.js Client instance for a single WhatsApp account.
 * Manages lifecycle, QR code generation, status tracking, and message sending.
 */
export class WhatsAppClientWrapper {
  private client: Client;
  private accountId: string;
  private status: WhatsAppStatus = WhatsAppStatus.DISCONNECTED;
  private qrCodeDataUrl: string | null = null;
  private eventHandlers: ClientEventHandlers;

  constructor(
    accountId: string,
    sessionData?: string,
    eventHandlers: ClientEventHandlers = {}
  ) {
    this.accountId = accountId;
    this.eventHandlers = eventHandlers;

    // Build client options. Use LocalAuth so sessions persist on disk.
    const clientOptions: ConstructorParameters<typeof Client>[0] = {
      authStrategy: new LocalAuth({ clientId: accountId }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      },
    };

    this.client = new Client(clientOptions);
    this._registerEventHandlers();
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  /** Attach all whatsapp-web.js event listeners. */
  private _registerEventHandlers(): void {
    // QR code event – convert raw QR string to a base64 data URL
    this.client.on("qr", async (qr: string) => {
      try {
        this.status = WhatsAppStatus.QR_READY;
        this.qrCodeDataUrl = await QRCode.toDataURL(qr);
        this.eventHandlers.onQR?.(this.qrCodeDataUrl);
      } catch (err) {
        console.error(
          `[WhatsApp][${this.accountId}] Failed to generate QR data URL:`,
          err
        );
      }
    });

    // Ready event – client is authenticated and connected
    this.client.on("ready", () => {
      this.status = WhatsAppStatus.CONNECTED;
      this.qrCodeDataUrl = null; // QR no longer needed
      this.eventHandlers.onReady?.();
    });

    // Disconnected event
    this.client.on("disconnected", (reason: string) => {
      this.status = WhatsAppStatus.DISCONNECTED;
      this.qrCodeDataUrl = null;
      this.eventHandlers.onDisconnected?.(reason);
    });

    // Authentication failure event
    this.client.on("auth_failure", (message: string) => {
      this.status = WhatsAppStatus.DISCONNECTED;
      this.qrCodeDataUrl = null;
      this.eventHandlers.onAuthFailure?.(message);
    });
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  /**
   * Initialize and start the WhatsApp client.
   * Sets status to CONNECTING while the client is starting up.
   */
  async initialize(): Promise<void> {
    this.status = WhatsAppStatus.CONNECTING;
    await this.client.initialize();
  }

  /**
   * Returns the current QR code as a base64 data URL, or null if not available.
   */
  getQRCode(): string | null {
    return this.qrCodeDataUrl;
  }

  /**
   * Send a text message to a recipient.
   * @param to   Recipient phone number in international format (e.g. "6281234567890")
   * @param message  Text content to send
   */
  async sendMessage(to: string, message: string): Promise<Message> {
    // whatsapp-web.js expects the chat ID in the format "<number>@c.us"
    const chatId = to.includes("@") ? to : `${to}@c.us`;
    return this.client.sendMessage(chatId, message);
  }

  /**
   * Gracefully disconnect and destroy the client.
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.destroy();
    } finally {
      this.status = WhatsAppStatus.DISCONNECTED;
      this.qrCodeDataUrl = null;
    }
  }

  /**
   * Returns the current connection status of this client.
   */
  getStatus(): WhatsAppStatus {
    return this.status;
  }

  /**
   * Returns the account ID associated with this wrapper.
   */
  getAccountId(): string {
    return this.accountId;
  }
}

// ============================================================
// WhatsAppClientManager (singleton)
// ============================================================

/**
 * Singleton manager that maintains a registry of WhatsAppClientWrapper instances,
 * keyed by accountId. Use this class to create, retrieve, and remove clients.
 */
export class WhatsAppClientManager {
  private static instance: WhatsAppClientManager;
  private clients: Map<string, WhatsAppClientWrapper> = new Map();

  private constructor() {}

  /** Returns the singleton instance of WhatsAppClientManager. */
  static getInstance(): WhatsAppClientManager {
    if (!WhatsAppClientManager.instance) {
      WhatsAppClientManager.instance = new WhatsAppClientManager();
    }
    return WhatsAppClientManager.instance;
  }

  /**
   * Retrieve an existing client wrapper by accountId.
   * Returns undefined if no client exists for the given accountId.
   */
  getClient(accountId: string): WhatsAppClientWrapper | undefined {
    return this.clients.get(accountId);
  }

  /**
   * Create a new WhatsAppClientWrapper for the given accountId and register it.
   * If a client already exists for this accountId, it is returned as-is.
   *
   * @param accountId   Unique identifier for the WhatsApp account
   * @param sessionData Optional encrypted session data (reserved for future use)
   * @param eventHandlers Optional event handler callbacks
   */
  createClient(
    accountId: string,
    sessionData?: string,
    eventHandlers: ClientEventHandlers = {}
  ): WhatsAppClientWrapper {
    if (this.clients.has(accountId)) {
      return this.clients.get(accountId)!;
    }

    const wrapper = new WhatsAppClientWrapper(
      accountId,
      sessionData,
      eventHandlers
    );
    this.clients.set(accountId, wrapper);
    return wrapper;
  }

  /**
   * Disconnect and remove a client from the registry.
   * No-op if no client exists for the given accountId.
   */
  async removeClient(accountId: string): Promise<void> {
    const wrapper = this.clients.get(accountId);
    if (wrapper) {
      await wrapper.disconnect();
      this.clients.delete(accountId);
    }
  }

  /**
   * Returns all registered client wrappers as an array.
   */
  getAllClients(): WhatsAppClientWrapper[] {
    return Array.from(this.clients.values());
  }
}

// Convenience export: the singleton manager instance
export const whatsappClientManager = WhatsAppClientManager.getInstance();
