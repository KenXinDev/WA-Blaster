import { Client, LocalAuth } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { WhatsAppStatus } from '@/types';

// Get Chromium executable path
function getChromiumPath(): string {
  // Try puppeteer's bundled chromium first
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer');
    const execPath = puppeteer.executablePath();
    if (execPath && fs.existsSync(execPath)) {
      return execPath;
    }
  } catch { /* ignore */ }

  // Common Windows paths
  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of windowsPaths) {
    if (p && fs.existsSync(p)) return p;
  }

  // Puppeteer cache paths
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const cachePaths = [
    path.join(userHome, '.cache', 'puppeteer', 'chrome'),
  ];
  for (const cacheDir of cachePaths) {
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir);
      for (const ver of versions.reverse()) {
        const candidates = [
          path.join(cacheDir, ver, 'chrome-win64', 'chrome.exe'),
          path.join(cacheDir, ver, 'chrome-win32', 'chrome.exe'),
          path.join(cacheDir, ver, 'chrome-linux', 'chrome'),
          path.join(cacheDir, ver, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    }
  }

  return ''; // Let puppeteer decide
}

// Enhanced account state with more detailed information
interface AccountState {
  status: WhatsAppStatus;
  qr: string | null;
  qrDataUrl: string | null; // Base64 data URL for QR code image
  client: Client | null;
  phoneNumber: string | null;
  lastError: string | null;
  connectionAttempts: number;
  lastConnected: Date | null;
  isInitializing: boolean;
}

// Enhanced event callback with more event types
type AccountEventCallback = (
  event: 'qr' | 'ready' | 'disconnected' | 'error' | 'auth_failure' | 'loading_screen',
  data?: string | { phoneNumber?: string; error?: string }
) => void;

// Message sending result
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// Broadcast progress tracking
interface BroadcastProgress {
  total: number;
  sent: number;
  failed: number;
  current: string; // current phone number being processed
}

type BroadcastProgressCallback = (progress: BroadcastProgress) => void;

// Global state management for WhatsApp accounts
const globalForWhatsApp = globalThis as unknown as {
  waAccounts: Map<string, AccountState> | undefined;
};

const waAccounts: Map<string, AccountState> =
  globalForWhatsApp.waAccounts ?? new Map();

// Always persist to globalThis so state survives module reloads in both dev and production
globalForWhatsApp.waAccounts = waAccounts;

// Session storage directory
const SESSION_DIR = path.join(process.cwd(), '.wwebjs_auth');
const QR_CACHE_DIR = path.join(process.cwd(), 'data', 'qr-cache');

// Ensure directories exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}
if (!fs.existsSync(QR_CACHE_DIR)) {
  fs.mkdirSync(QR_CACHE_DIR, { recursive: true });
}

// Persist QR data to file so it survives hot-reloads
function saveQRToFile(accountId: string, qr: string, qrDataUrl: string) {
  try {
    const qrFile = path.join(QR_CACHE_DIR, `${accountId}_qr.json`);
    fs.writeFileSync(qrFile, JSON.stringify({ qr, qrDataUrl, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

function loadQRFromFile(accountId: string): { qr: string; qrDataUrl: string } | null {
  try {
    const qrFile = path.join(QR_CACHE_DIR, `${accountId}_qr.json`);
    if (!fs.existsSync(qrFile)) return null;
    const data = JSON.parse(fs.readFileSync(qrFile, 'utf-8'));
    // QR codes expire after 60 seconds
    if (Date.now() - data.timestamp > 60000) {
      fs.unlinkSync(qrFile);
      return null;
    }
    return { qr: data.qr, qrDataUrl: data.qrDataUrl };
  } catch { return null; }
}

function clearQRFile(accountId: string) {
  try {
    const qrFile = path.join(QR_CACHE_DIR, `${accountId}_qr.json`);
    if (fs.existsSync(qrFile)) fs.unlinkSync(qrFile);
  } catch { /* ignore */ }
}

function getOrCreateState(accountId: string): AccountState {
  if (!waAccounts.has(accountId)) {
    waAccounts.set(accountId, {
      status: WhatsAppStatus.DISCONNECTED,
      qr: null,
      qrDataUrl: null,
      client: null,
      phoneNumber: null,
      lastError: null,
      connectionAttempts: 0,
      lastConnected: null,
      isInitializing: false,
    });
  }
  return waAccounts.get(accountId)!;
}

// Utility function to create QR code data URL
async function generateQRDataUrl(qrText: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qrText, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

// Utility function to validate phone number format
function validatePhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}

// Utility function to format phone number for WhatsApp
// Handles: 08xxx → 628xxx, 62xxx → 628xxx, +62xxx → 628xxx, 8xxx → 628xxx
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digits
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Remove leading zeros then check prefix
  if (cleaned.startsWith('0')) {
    // 08xxx → 628xxx
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('62')) {
    // already correct — keep as is
  } else if (cleaned.startsWith('8')) {
    // 8xxx → 628xxx (common short format)
    cleaned = '62' + cleaned;
  }
  // else: assume already in correct international format

  return `${cleaned}@c.us`;
}

// Enhanced WhatsApp Client Manager with comprehensive functionality
export class WhatsAppClientManager {
  /**
   * Initialize a WhatsApp client for a specific account
   */
  static async initForAccount(accountId: string, onEvent: AccountEventCallback): Promise<void> {
    const state = getOrCreateState(accountId);
    
    // Prevent multiple initialization attempts
    if (state.client || state.isInitializing) {
      console.log(`[WhatsApp] Account ${accountId} already initializing or initialized`);
      return;
    }

    state.isInitializing = true;
    state.status = WhatsAppStatus.CONNECTING;
    state.qr = null;
    state.qrDataUrl = null;
    state.lastError = null;
    state.connectionAttempts += 1;

    try {
      console.log(`[WhatsApp] Initializing client for account ${accountId}`);

      const chromiumPath = getChromiumPath();
      console.log(`[WhatsApp] Using Chromium: ${chromiumPath || 'auto-detect'}`);

      const client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: `account-${accountId}`,
          dataPath: SESSION_DIR
        }),
        puppeteer: {
          headless: true,
          executablePath: chromiumPath || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--safebrowsing-disable-auto-update',
          ],
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
      });

      // QR Code event - user needs to scan this
      client.on('qr', async (qr: string) => {
        console.log(`[WhatsApp] QR Code generated for account ${accountId}`);
        state.qr = qr;
        state.status = WhatsAppStatus.QR_READY;
        
        // Generate QR code data URL for display
        state.qrDataUrl = await generateQRDataUrl(qr);
        
        // Persist to file so it survives hot-reloads
        saveQRToFile(accountId, qr, state.qrDataUrl);
        
        onEvent('qr', qr);
      });

      // Ready event - client is authenticated and ready
      client.on('ready', () => {
        console.log(`[WhatsApp] Client ready for account ${accountId}`);
        state.qr = null;
        state.qrDataUrl = null;
        state.status = WhatsAppStatus.CONNECTED;
        state.lastConnected = new Date();
        state.lastError = null;
        state.isInitializing = false;

        // Clear QR file
        clearQRFile(accountId);

        // Get phone number from client info
        const info = (client as any).info;
        const phoneNumber = info?.wid?.user || info?.me?.user || '';
        state.phoneNumber = phoneNumber;

        onEvent('ready', phoneNumber);
      });

      // Disconnected event
      client.on('disconnected', (reason: string) => {
        console.log(`[WhatsApp] Client disconnected for account ${accountId}:`, reason);
        state.status = WhatsAppStatus.DISCONNECTED;
        state.qr = null;
        state.qrDataUrl = null;
        state.client = null;
        state.isInitializing = false;
        state.lastError = `Disconnected: ${reason}`;
        
        clearQRFile(accountId);
        onEvent('disconnected', reason);
      });

      // Authentication failure event
      client.on('auth_failure', (message: string) => {
        console.error(`[WhatsApp] Auth failure for account ${accountId}:`, message);
        state.status = WhatsAppStatus.DISCONNECTED;
        state.client = null;
        state.isInitializing = false;
        state.lastError = `Authentication failed: ${message}`;
        
        onEvent('auth_failure', message);
      });

      // Loading screen event
      client.on('loading_screen', (percent: number, message: string) => {
        console.log(`[WhatsApp] Loading ${percent}% for account ${accountId}: ${message}`);
        onEvent('loading_screen', `${percent}%: ${message}`);
      });

      // Error event
      client.on('error', (error: Error) => {
        console.error(`[WhatsApp] Client error for account ${accountId}:`, error);
        state.lastError = error.message;
        onEvent('error', error.message);
      });

      // Store client reference
      state.client = client;

      // Initialize the client
      await client.initialize();

    } catch (error) {
      console.error(`[WhatsApp] Initialization error for account ${accountId}:`, error);
      state.status = WhatsAppStatus.DISCONNECTED;
      state.client = null;
      state.isInitializing = false;
      state.lastError = error instanceof Error ? error.message : 'Unknown initialization error';
      
      onEvent('error', state.lastError);
    }
  }

  /**
   * Send a single message to a phone number
   */
  static async sendMessage(
    accountId: string, 
    phoneNumber: string, 
    message: string
  ): Promise<SendMessageResult> {
    const state = waAccounts.get(accountId);
    
    if (!state?.client || state.status !== WhatsAppStatus.CONNECTED) {
      // Diagnostic log to help debug connection issues
      console.error(
        `[WhatsApp] sendMessage failed — accountId="${accountId}" ` +
        `state=${state ? `status=${state.status} hasClient=${!!state.client}` : 'NOT_FOUND'} ` +
        `mapSize=${waAccounts.size} knownIds=[${Array.from(waAccounts.keys()).join(', ')}]`
      );
      return {
        success: false,
        error: `WhatsApp client not connected (status: ${state?.status ?? 'NOT_FOUND'})`,
        timestamp: new Date()
      };
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format',
        timestamp: new Date()
      };
    }

    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      console.log(`[WhatsApp] Sending message to ${formattedNumber} from account ${accountId}`);
      
      const sentMessage = await state.client.sendMessage(formattedNumber, message);
      
      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`[WhatsApp] Error sending message to ${phoneNumber}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown send error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send broadcast messages to multiple phone numbers with delay
   */
  static async sendBroadcast(
    accountId: string,
    phoneNumbers: string[],
    message: string,
    delayMs: number = 30000, // 30 seconds default delay
    onProgress?: BroadcastProgressCallback
  ): Promise<{ success: boolean; results: SendMessageResult[]; summary: { total: number; sent: number; failed: number } }> {
    const state = waAccounts.get(accountId);
    
    if (!state?.client || state.status !== WhatsAppStatus.CONNECTED) {
      throw new Error('WhatsApp client not connected');
    }

    const results: SendMessageResult[] = [];
    let sent = 0;
    let failed = 0;

    console.log(`[WhatsApp] Starting broadcast to ${phoneNumbers.length} numbers from account ${accountId}`);

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];
      
      // Update progress
      if (onProgress) {
        onProgress({
          total: phoneNumbers.length,
          sent,
          failed,
          current: phoneNumber
        });
      }

      // Send message
      const result = await this.sendMessage(accountId, phoneNumber, message);
      results.push(result);

      if (result.success) {
        sent++;
        console.log(`[WhatsApp] Message sent successfully to ${phoneNumber} (${sent}/${phoneNumbers.length})`);
      } else {
        failed++;
        console.error(`[WhatsApp] Failed to send message to ${phoneNumber}: ${result.error}`);
      }

      // Add delay between messages (except for the last one)
      if (i < phoneNumbers.length - 1) {
        console.log(`[WhatsApp] Waiting ${delayMs}ms before next message...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        total: phoneNumbers.length,
        sent,
        failed,
        current: ''
      });
    }

    console.log(`[WhatsApp] Broadcast completed: ${sent} sent, ${failed} failed`);

    return {
      success: true,
      results,
      summary: {
        total: phoneNumbers.length,
        sent,
        failed
      }
    };
  }

  /**
   * Logout and disconnect an account
   */
  static async logoutAccount(accountId: string): Promise<void> {
    const state = waAccounts.get(accountId);
    clearQRFile(accountId);
    if (!state?.client) return;

    try {
      console.log(`[WhatsApp] Logging out account ${accountId}`);
      await state.client.logout();
      state.client.destroy();
    } catch (error) {
      console.error(`[WhatsApp] Error during logout for account ${accountId}:`, error);
    } finally {
      state.client = null;
      state.status = WhatsAppStatus.DISCONNECTED;
      state.qr = null;
      state.qrDataUrl = null;
      state.phoneNumber = null;
      state.isInitializing = false;
    }
  }

  /**
   * Get current status for an account
   */
  static getStatusForAccount(accountId: string): WhatsAppStatus {
    return waAccounts.get(accountId)?.status ?? WhatsAppStatus.DISCONNECTED;
  }

  /**
   * Get QR code text for an account
   */
  static getQRForAccount(accountId: string): string | null {
    return waAccounts.get(accountId)?.qr ?? null;
  }

  /**
   * Get QR code data URL for display
   */
  static getQRDataUrlForAccount(accountId: string): string | null {
    return waAccounts.get(accountId)?.qrDataUrl ?? null;
  }

  /**
   * Get client instance for an account
   */
  static getClientForAccount(accountId: string): Client | null {
    return waAccounts.get(accountId)?.client ?? null;
  }

  /**
   * Get detailed account information
   */
  static getAccountInfo(accountId: string): {
    status: WhatsAppStatus;
    phoneNumber: string | null;
    qr: string | null;
    qrDataUrl: string | null;
    lastError: string | null;
    connectionAttempts: number;
    lastConnected: Date | null;
    isInitializing: boolean;
  } {
    const state = waAccounts.get(accountId);
    if (!state) {
      // Check if there's a cached QR from before hot-reload
      const cachedQR = loadQRFromFile(accountId);
      if (cachedQR) {
        return {
          status: WhatsAppStatus.QR_READY,
          phoneNumber: null,
          qr: cachedQR.qr,
          qrDataUrl: cachedQR.qrDataUrl,
          lastError: null,
          connectionAttempts: 0,
          lastConnected: null,
          isInitializing: false,
        };
      }
      return {
        status: WhatsAppStatus.DISCONNECTED,
        phoneNumber: null,
        qr: null,
        qrDataUrl: null,
        lastError: null,
        connectionAttempts: 0,
        lastConnected: null,
        isInitializing: false,
      };
    }

    // If in-memory QR is null but file has one, use file
    let qr = state.qr;
    let qrDataUrl = state.qrDataUrl;
    if (!qr && state.status === WhatsAppStatus.QR_READY) {
      const cached = loadQRFromFile(accountId);
      if (cached) { qr = cached.qr; qrDataUrl = cached.qrDataUrl; }
    }

    return {
      status: state.status,
      phoneNumber: state.phoneNumber,
      qr,
      qrDataUrl,
      lastError: state.lastError,
      connectionAttempts: state.connectionAttempts,
      lastConnected: state.lastConnected,
      isInitializing: state.isInitializing,
    };
  }

  /**
   * Check if a phone number is registered on WhatsApp
   */
  static async isRegisteredUser(accountId: string, phoneNumber: string): Promise<boolean> {
    const state = waAccounts.get(accountId);
    
    if (!state?.client || state.status !== WhatsAppStatus.CONNECTED) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      const isRegistered = await state.client.isRegisteredUser(formattedNumber);
      return isRegistered;
    } catch (error) {
      console.error(`[WhatsApp] Error checking if ${phoneNumber} is registered:`, error);
      return false;
    }
  }

  /**
   * Get all active accounts
   */
  static getAllAccounts(): Array<{
    accountId: string;
    status: WhatsAppStatus;
    phoneNumber: string | null;
    lastConnected: Date | null;
  }> {
    const accounts: Array<{
      accountId: string;
      status: WhatsAppStatus;
      phoneNumber: string | null;
      lastConnected: Date | null;
    }> = [];

    for (const [accountId, state] of Array.from(waAccounts.entries())) {
      accounts.push({
        accountId,
        status: state.status,
        phoneNumber: state.phoneNumber,
        lastConnected: state.lastConnected,
      });
    }

    return accounts;
  }

  /**
   * Clean up session files for an account
   */
  static async cleanupSession(accountId: string): Promise<void> {
    const sessionPath = path.join(SESSION_DIR, `session-account-${accountId}`);
    
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[WhatsApp] Cleaned up session files for account ${accountId}`);
      }
    } catch (error) {
      console.error(`[WhatsApp] Error cleaning up session for account ${accountId}:`, error);
    }
  }

  // Legacy methods for backward compatibility
  static init() {
    console.warn('[WhatsApp] Legacy init() method called - use initForAccount() instead');
  }

  static getStatus() {
    console.warn('[WhatsApp] Legacy getStatus() method called - use getStatusForAccount() instead');
    return { status: WhatsAppStatus.DISCONNECTED, qr: null };
  }

  static async logout() {
    console.warn('[WhatsApp] Legacy logout() method called - use logoutAccount() instead');
  }
}
