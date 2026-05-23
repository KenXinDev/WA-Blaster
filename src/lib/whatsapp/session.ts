import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WhatsApp session encryption and storage utilities.
 * Provides secure session management with AES-256-GCM encryption.
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16 bytes
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Session storage directory
const SESSION_STORAGE_DIR = path.join(process.cwd(), '.wwebjs_sessions');

// Ensure session storage directory exists
if (!fs.existsSync(SESSION_STORAGE_DIR)) {
  fs.mkdirSync(SESSION_STORAGE_DIR, { recursive: true });
}

/**
 * Generate a secure encryption key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt session data using AES-256-GCM
 */
export function encryptSessionData(data: string, password: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('whatsapp-session'));
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('[Session] Encryption error:', error);
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Decrypt session data using AES-256-GCM
 */
export function decryptSessionData(encryptedData: string, password: string): string {
  try {
    // Parse combined data
    const combined = Buffer.from(encryptedData, 'base64');
    
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('whatsapp-session'));
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Session] Decryption error:', error);
    throw new Error('Failed to decrypt session data');
  }
}

/**
 * Generate a secure session encryption key
 */
export function generateSessionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Session metadata interface
 */
interface SessionMetadata {
  accountId: string;
  phoneNumber: string | null;
  createdAt: Date;
  lastAccessed: Date;
  version: string;
}

/**
 * Session file manager for persistent storage
 */
export class SessionFileManager {
  private static getSessionFilePath(accountId: string): string {
    return path.join(SESSION_STORAGE_DIR, `session-${accountId}.json`);
  }

  private static getMetadataFilePath(accountId: string): string {
    return path.join(SESSION_STORAGE_DIR, `metadata-${accountId}.json`);
  }

  /**
   * Save encrypted session data to file
   */
  static async saveSession(
    accountId: string,
    sessionData: any,
    phoneNumber: string | null,
    encryptionKey: string
  ): Promise<void> {
    try {
      const sessionFilePath = this.getSessionFilePath(accountId);
      const metadataFilePath = this.getMetadataFilePath(accountId);

      // Serialize session data
      const serializedData = JSON.stringify(sessionData);

      // Encrypt session data
      const encryptedData = encryptSessionData(serializedData, encryptionKey);

      // Create metadata
      const metadata: SessionMetadata = {
        accountId,
        phoneNumber,
        createdAt: new Date(),
        lastAccessed: new Date(),
        version: '1.0'
      };

      // Write files atomically
      const tempSessionFile = `${sessionFilePath}.tmp`;
      const tempMetadataFile = `${metadataFilePath}.tmp`;

      await fs.promises.writeFile(tempSessionFile, encryptedData, 'utf8');
      await fs.promises.writeFile(tempMetadataFile, JSON.stringify(metadata, null, 2), 'utf8');

      // Atomic rename
      await fs.promises.rename(tempSessionFile, sessionFilePath);
      await fs.promises.rename(tempMetadataFile, metadataFilePath);

      console.log(`[Session] Saved session for account ${accountId}`);
    } catch (error) {
      console.error(`[Session] Error saving session for account ${accountId}:`, error);
      throw new Error('Failed to save session data');
    }
  }

  /**
   * Load and decrypt session data from file
   */
  static async loadSession(accountId: string, encryptionKey: string): Promise<any | null> {
    try {
      const sessionFilePath = this.getSessionFilePath(accountId);
      const metadataFilePath = this.getMetadataFilePath(accountId);

      // Check if files exist
      if (!fs.existsSync(sessionFilePath) || !fs.existsSync(metadataFilePath)) {
        return null;
      }

      // Read encrypted data
      const encryptedData = await fs.promises.readFile(sessionFilePath, 'utf8');
      
      // Decrypt session data
      const decryptedData = decryptSessionData(encryptedData, encryptionKey);
      
      // Parse session data
      const sessionData = JSON.parse(decryptedData);

      // Update last accessed time
      const metadata = await this.getSessionMetadata(accountId);
      if (metadata) {
        metadata.lastAccessed = new Date();
        await fs.promises.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf8');
      }

      console.log(`[Session] Loaded session for account ${accountId}`);
      return sessionData;
    } catch (error) {
      console.error(`[Session] Error loading session for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Get session metadata
   */
  static async getSessionMetadata(accountId: string): Promise<SessionMetadata | null> {
    try {
      const metadataFilePath = this.getMetadataFilePath(accountId);
      
      if (!fs.existsSync(metadataFilePath)) {
        return null;
      }

      const metadataContent = await fs.promises.readFile(metadataFilePath, 'utf8');
      const metadata = JSON.parse(metadataContent) as SessionMetadata;
      
      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt);
      metadata.lastAccessed = new Date(metadata.lastAccessed);
      
      return metadata;
    } catch (error) {
      console.error(`[Session] Error reading metadata for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Delete session files for an account
   */
  static async deleteSession(accountId: string): Promise<void> {
    try {
      const sessionFilePath = this.getSessionFilePath(accountId);
      const metadataFilePath = this.getMetadataFilePath(accountId);

      // Delete files if they exist
      if (fs.existsSync(sessionFilePath)) {
        await fs.promises.unlink(sessionFilePath);
      }
      
      if (fs.existsSync(metadataFilePath)) {
        await fs.promises.unlink(metadataFilePath);
      }

      console.log(`[Session] Deleted session files for account ${accountId}`);
    } catch (error) {
      console.error(`[Session] Error deleting session for account ${accountId}:`, error);
      throw new Error('Failed to delete session data');
    }
  }

  /**
   * List all stored sessions
   */
  static async listSessions(): Promise<SessionMetadata[]> {
    try {
      const files = await fs.promises.readdir(SESSION_STORAGE_DIR);
      const metadataFiles = files.filter(file => file.startsWith('metadata-') && file.endsWith('.json'));
      
      const sessions: SessionMetadata[] = [];
      
      for (const file of metadataFiles) {
        const accountId = file.replace('metadata-', '').replace('.json', '');
        const metadata = await this.getSessionMetadata(accountId);
        if (metadata) {
          sessions.push(metadata);
        }
      }
      
      return sessions.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    } catch (error) {
      console.error('[Session] Error listing sessions:', error);
      return [];
    }
  }

  /**
   * Check if session exists for an account
   */
  static sessionExists(accountId: string): boolean {
    const sessionFilePath = this.getSessionFilePath(accountId);
    const metadataFilePath = this.getMetadataFilePath(accountId);
    return fs.existsSync(sessionFilePath) && fs.existsSync(metadataFilePath);
  }

  /**
   * Clean up old sessions (older than specified days)
   */
  static async cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
    try {
      const sessions = await this.listSessions();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      let deletedCount = 0;
      
      for (const session of sessions) {
        if (session.lastAccessed < cutoffDate) {
          await this.deleteSession(session.accountId);
          deletedCount++;
        }
      }
      
      console.log(`[Session] Cleaned up ${deletedCount} old sessions`);
      return deletedCount;
    } catch (error) {
      console.error('[Session] Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalSessions: number;
    totalSize: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  }> {
    try {
      const sessions = await this.listSessions();
      
      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalSize: 0,
          oldestSession: null,
          newestSession: null
        };
      }

      // Calculate total size
      let totalSize = 0;
      for (const session of sessions) {
        const sessionFilePath = this.getSessionFilePath(session.accountId);
        const metadataFilePath = this.getMetadataFilePath(session.accountId);
        
        if (fs.existsSync(sessionFilePath)) {
          const stats = await fs.promises.stat(sessionFilePath);
          totalSize += stats.size;
        }
        
        if (fs.existsSync(metadataFilePath)) {
          const stats = await fs.promises.stat(metadataFilePath);
          totalSize += stats.size;
        }
      }

      // Find oldest and newest sessions
      const sortedByCreated = [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      return {
        totalSessions: sessions.length,
        totalSize,
        oldestSession: sortedByCreated[0]?.createdAt || null,
        newestSession: sortedByCreated[sortedByCreated.length - 1]?.createdAt || null
      };
    } catch (error) {
      console.error('[Session] Error getting storage stats:', error);
      return {
        totalSessions: 0,
        totalSize: 0,
        oldestSession: null,
        newestSession: null
      };
    }
  }
}
