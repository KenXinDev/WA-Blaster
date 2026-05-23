import prisma from '@/lib/prisma';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';
import { SessionFileManager, generateSessionKey } from '@/lib/whatsapp/session';
import { WhatsAppStatus } from '@/types';

export class WhatsAppService {
  /**
   * Get all WhatsApp accounts for a user
   */
  static async getAccounts(userId: string) {
    const accounts = await prisma.whatsAppAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    
    return accounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      phoneNumber: a.phoneNumber,
      displayName: a.displayName,
      status: a.status as WhatsAppStatus,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      lastConnected: a.lastConnected,
    }));
  }

  /**
   * Add a new WhatsApp account
   */
  static async addAccount(userId: string, displayName: string) {
    const account = await prisma.whatsAppAccount.create({
      data: {
        userId,
        displayName,
        phoneNumber: '',
        status: WhatsAppStatus.DISCONNECTED,
      },
    });
    return account;
  }

  /**
   * Connect a WhatsApp account with enhanced session management
   */
  static async connectAccount(accountId: string, userId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    // Update status to connecting
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { status: WhatsAppStatus.CONNECTING },
    });

    // Generate encryption key if not exists
    let encryptionKey = account.sessionData;
    if (!encryptionKey) {
      encryptionKey = generateSessionKey();
      await prisma.whatsAppAccount.update({
        where: { id: accountId },
        data: { sessionData: encryptionKey },
      });
    }

    // Initialize WhatsApp client with enhanced event handling
    WhatsAppClientManager.initForAccount(accountId, async (event, data) => {
      try {
        switch (event) {
          case 'qr':
            console.log(`[WhatsApp Service] QR code generated for account ${accountId}`);
            await prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: { status: WhatsAppStatus.QR_READY },
            });
            break;

          case 'ready':
            const phoneNumber = (data as string) || '';
            console.log(`[WhatsApp Service] Account ${accountId} ready with phone ${phoneNumber}`);
            
            await prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: { 
                status: WhatsAppStatus.CONNECTED, 
                phoneNumber,
                lastConnected: new Date()
              },
            });

            // Save session data to file system
            const client = WhatsAppClientManager.getClientForAccount(accountId);
            if (client) {
              try {
                // Get session data from client (this would need to be implemented in whatsapp-web.js)
                const sessionData = { phoneNumber, connectedAt: new Date() };
                await SessionFileManager.saveSession(accountId, sessionData, phoneNumber, encryptionKey!);
              } catch (sessionError) {
                console.error(`[WhatsApp Service] Error saving session for account ${accountId}:`, sessionError);
              }
            }
            break;

          case 'disconnected':
            console.log(`[WhatsApp Service] Account ${accountId} disconnected`);
            await prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: { status: WhatsAppStatus.DISCONNECTED },
            });
            break;

          case 'auth_failure':
            console.error(`[WhatsApp Service] Auth failure for account ${accountId}:`, data);
            await prisma.whatsAppAccount.update({
              where: { id: accountId },
              data: { status: WhatsAppStatus.DISCONNECTED },
            });
            break;

          case 'error':
            console.error(`[WhatsApp Service] Error for account ${accountId}:`, data);
            // Don't change status on general errors, let the client handle reconnection
            break;

          case 'loading_screen':
            console.log(`[WhatsApp Service] Loading for account ${accountId}:`, data);
            // Keep status as connecting during loading
            break;
        }
      } catch (error) {
        console.error(`[WhatsApp Service] Error handling event ${event} for account ${accountId}:`, error);
      }
    });

    return { success: true };
  }

  /**
   * Disconnect a WhatsApp account
   */
  static async disconnectAccount(accountId: string, userId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    // Logout from WhatsApp client
    await WhatsAppClientManager.logoutAccount(accountId);

    // Update database status
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { status: WhatsAppStatus.DISCONNECTED },
    });

    return { success: true };
  }

  /**
   * Get QR code for account connection
   */
  static async getQRCode(accountId: string, userId: string): Promise<{
    qr: string | null;
    qrDataUrl: string | null;
  }> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    const qr = WhatsAppClientManager.getQRForAccount(accountId);
    const qrDataUrl = WhatsAppClientManager.getQRDataUrlForAccount(accountId);

    return { qr, qrDataUrl };
  }

  /**
   * Get detailed account status
   */
  static async getAccountStatus(accountId: string, userId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    // Get live status from client manager
    const clientInfo = WhatsAppClientManager.getAccountInfo(accountId);
    
    return {
      id: account.id,
      displayName: account.displayName,
      phoneNumber: clientInfo.phoneNumber || account.phoneNumber,
      status: clientInfo.status,
      qr: clientInfo.qr,
      qrDataUrl: clientInfo.qrDataUrl,
      lastError: clientInfo.lastError,
      connectionAttempts: clientInfo.connectionAttempts,
      lastConnected: clientInfo.lastConnected || account.lastConnected,
      isInitializing: clientInfo.isInitializing,
    };
  }

  /**
   * Delete a WhatsApp account and cleanup all data
   */
  static async deleteAccount(accountId: string, userId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    // Logout and cleanup client
    await WhatsAppClientManager.logoutAccount(accountId);
    
    // Cleanup session files
    try {
      await SessionFileManager.deleteSession(accountId);
    } catch (error) {
      console.error(`[WhatsApp Service] Error deleting session files for account ${accountId}:`, error);
    }

    // Cleanup WhatsApp client session directory
    try {
      await WhatsAppClientManager.cleanupSession(accountId);
    } catch (error) {
      console.error(`[WhatsApp Service] Error cleaning up client session for account ${accountId}:`, error);
    }

    // Delete from database
    await prisma.whatsAppAccount.delete({ where: { id: accountId } });
    
    return { success: true };
  }

  /**
   * Send a message from a specific account
   */
  static async sendMessage(accountId: string, userId: string, phoneNumber: string, message: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    const result = await WhatsAppClientManager.sendMessage(accountId, phoneNumber, message);
    
    return result;
  }

  /**
   * Send broadcast messages from a specific account
   */
  static async sendBroadcast(
    accountId: string, 
    userId: string, 
    phoneNumbers: string[], 
    message: string, 
    delayMs: number = 30000,
    onProgress?: (progress: { total: number; sent: number; failed: number; current: string }) => void
  ) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    const result = await WhatsAppClientManager.sendBroadcast(
      accountId, 
      phoneNumbers, 
      message, 
      delayMs, 
      onProgress
    );
    
    return result;
  }

  /**
   * Check if a phone number is registered on WhatsApp
   */
  static async isRegisteredUser(accountId: string, userId: string, phoneNumber: string): Promise<boolean> {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error('Account not found');

    return await WhatsAppClientManager.isRegisteredUser(accountId, phoneNumber);
  }

  /**
   * Get all active accounts with their live status
   */
  static async getAllAccountsWithStatus(userId: string) {
    const accounts = await this.getAccounts(userId);
    
    return accounts.map(account => {
      const clientInfo = WhatsAppClientManager.getAccountInfo(account.id);
      return {
        ...account,
        liveStatus: clientInfo.status,
        livePhoneNumber: clientInfo.phoneNumber,
        qr: clientInfo.qr,
        qrDataUrl: clientInfo.qrDataUrl,
        lastError: clientInfo.lastError,
        isInitializing: clientInfo.isInitializing,
      };
    });
  }

  /**
   * Restore sessions on application startup
   */
  static async restoreSessions(userId: string) {
    console.log(`[WhatsApp Service] Restoring sessions for user ${userId}`);
    
    const accounts = await prisma.whatsAppAccount.findMany({
      where: { 
        userId,
        status: { in: [WhatsAppStatus.CONNECTED, WhatsAppStatus.CONNECTING] }
      },
    });

    for (const account of accounts) {
      try {
        // Check if session file exists
        if (SessionFileManager.sessionExists(account.id)) {
          console.log(`[WhatsApp Service] Restoring session for account ${account.id}`);
          
          // Load session data
          const sessionData = await SessionFileManager.loadSession(account.id, account.sessionData || '');
          
          if (sessionData) {
            // Reconnect the account
            await this.connectAccount(account.id, userId);
          } else {
            // Session data corrupted, mark as disconnected
            await prisma.whatsAppAccount.update({
              where: { id: account.id },
              data: { status: WhatsAppStatus.DISCONNECTED },
            });
          }
        } else {
          // No session file, mark as disconnected
          await prisma.whatsAppAccount.update({
            where: { id: account.id },
            data: { status: WhatsAppStatus.DISCONNECTED },
          });
        }
      } catch (error) {
        console.error(`[WhatsApp Service] Error restoring session for account ${account.id}:`, error);
        
        // Mark as disconnected on error
        await prisma.whatsAppAccount.update({
          where: { id: account.id },
          data: { status: WhatsAppStatus.DISCONNECTED },
        });
      }
    }
  }

  /**
   * Get session storage statistics
   */
  static async getSessionStats() {
    return await SessionFileManager.getStorageStats();
  }

  /**
   * Cleanup old sessions
   */
  static async cleanupOldSessions(maxAgeDays: number = 30) {
    return await SessionFileManager.cleanupOldSessions(maxAgeDays);
  }
}
