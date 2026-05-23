import prisma from '@/lib/prisma';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';
import { HistoryService } from './historyService';
import { enforceDelay, getRandomDelay } from './delay-config';

export class MessageService {
  static replacePlaceholders(
    template: string,
    data: Record<string, string>
  ): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
      return data[key] ?? `{${key}}`;
    });
  }

  static extractPlaceholders(template: string): string[] {
    const matches = template.match(/\{(\w+)\}/g) ?? [];
    return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
  }

  static async sendBroadcast(params: {
    userId: string;
    accountId: string;
    excelFileId: string;
    phoneColumn: string;
    messageTemplate: string;
    rows: Array<Record<string, string>>;
    delayMin: number;
    delayMax: number;
  }): Promise<string> {
    const { userId, accountId, excelFileId, phoneColumn, messageTemplate, rows, delayMin, delayMax } = params;

    const history = await HistoryService.createHistory({
      userId,
      whatsappAccountId: accountId,
      excelFileId,
      totalRecipients: rows.length,
      messageContent: messageTemplate,
    });

    const historyId = history.id;

    // Run broadcast asynchronously so the API can return the historyId immediately
    (async () => {
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const phoneNumber = row[phoneColumn]?.trim();

        if (!phoneNumber) {
          failureCount++;
          await HistoryService.addDeliveryResult({
            historyId,
            phoneNumber: phoneNumber ?? 'unknown',
            status: 'FAILED',
            errorMessage: 'Missing phone number',
          });
          continue;
        }

        const message = MessageService.replacePlaceholders(messageTemplate, row);

        try {
          const client = WhatsAppClientManager.getClientForAccount(accountId);
          if (!client) throw new Error('WhatsApp client not connected');

          // Format nomor: 08xxx → 628xxx, 8xxx → 628xxx, dst.
          let cleaned = phoneNumber.replace(/\D/g, '');
          if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
          } else if (cleaned.startsWith('8')) {
            cleaned = '62' + cleaned;
          }
          const chatId = `${cleaned}@c.us`;

          await client.sendMessage(chatId, message);

          successCount++;
          await HistoryService.addDeliveryResult({
            historyId,
            phoneNumber,
            status: 'SENT',
            sentAt: new Date(),
          });
        } catch (err) {
          failureCount++;
          await HistoryService.addDeliveryResult({
            historyId,
            phoneNumber,
            status: 'FAILED',
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
          });
        }

        // Update running counts in DB
        await HistoryService.updateHistory(historyId, {
          successCount,
          failureCount,
        });

        // Apply delay between messages (skip after last message)
        if (i < rows.length - 1) {
          const delay = getRandomDelay(delayMin, delayMax);
          await enforceDelay(delay);
        }
      }

      await HistoryService.updateHistory(historyId, {
        status: failureCount === rows.length ? 'FAILED' : 'COMPLETED',
        successCount,
        failureCount,
        completedAt: new Date(),
      });
    })().catch(async (err) => {
      console.error('[MessageService] Broadcast error:', err);
      await HistoryService.updateHistory(historyId, {
        status: 'FAILED',
        completedAt: new Date(),
      });
    });

    return historyId;
  }
}
