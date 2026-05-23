import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';
import { WhatsAppStatus } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Global set of cancelled broadcast IDs — persisted on globalThis so it
// survives hot-reloads and is accessible from the cancel API route.
const g = globalThis as unknown as { cancelledBroadcasts: Set<string> | undefined };
if (!g.cancelledBroadcasts) g.cancelledBroadcasts = new Set<string>();
export const cancelledBroadcasts: Set<string> = g.cancelledBroadcasts;

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

interface BroadcastRequest {
  accountId?: string;
  phoneNumbers?: string[];
  messages?: string[];   // personalized per-recipient (optional)
  message?: string;      // fallback template for all
  delayMs?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as BroadcastRequest;
    const {
      accountId = 'default',
      phoneNumbers,
      messages,
      message,
      delayMs = 30000,
    } = body;

    // Validate phone numbers
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'phoneNumbers array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate message
    const templateMessage = message?.trim() ?? '';
    if (!templateMessage && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Check WhatsApp connection
    const accountInfo = WhatsAppClientManager.getAccountInfo(accountId);
    if (accountInfo.status !== WhatsAppStatus.CONNECTED) {
      const statusMsg = accountInfo.isInitializing
        ? 'WhatsApp sedang menginisialisasi. Tunggu hingga QR code muncul dan scan.'
        : accountInfo.status === WhatsAppStatus.QR_READY
        ? 'WhatsApp menunggu scan QR code. Silakan scan QR code terlebih dahulu.'
        : 'WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu di halaman Dashboard.';

      return NextResponse.json({ error: statusMsg }, { status: 400 });
    }

    // Build per-recipient message list
    // If personalized messages array provided, use it; otherwise use template for all
    const resolvedMessages: string[] = phoneNumbers.map((_, i) => {
      if (messages && messages[i]) return messages[i];
      return templateMessage;
    });

    // Create history record
    const historyId = `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const historyRecord = {
      id: historyId,
      userId: session.user.id,
      accountId,
      message: templateMessage || resolvedMessages[0] || '',
      phoneNumbers,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: [] as any[],
      summary: { total: phoneNumbers.length, sent: 0, failed: 0 },
    };

    const historyFile = path.join(HISTORY_DIR, `${historyId}.json`);
    fs.writeFileSync(historyFile, JSON.stringify(historyRecord, null, 2));

    // Run broadcast in background
    setImmediate(async () => {
      let sent = 0;
      let failed = 0;
      const results: any[] = [];

      console.log(`[Broadcast] Starting ${historyId} — ${phoneNumbers.length} recipients`);

      for (let i = 0; i < phoneNumbers.length; i++) {
        const phone = phoneNumbers[i];
        const msg = resolvedMessages[i];

        // Update progress
        const progressRecord = {
          ...historyRecord,
          summary: { total: phoneNumbers.length, sent, failed },
          currentPhone: phone,
        };
        fs.writeFileSync(historyFile, JSON.stringify(progressRecord, null, 2));

        // Check cancellation BEFORE sending
        if (cancelledBroadcasts.has(historyId)) {
          console.log(`[Broadcast] ⛔ ${historyId} dibatalkan pada nomor ke-${i + 1}`);
          // Mark as cancelled in file
          const cancelledRecord = {
            ...historyRecord,
            status: 'cancelled',
            completedAt: new Date().toISOString(),
            results,
            summary: { total: phoneNumbers.length, sent, failed },
          };
          fs.writeFileSync(historyFile, JSON.stringify(cancelledRecord, null, 2));
          cancelledBroadcasts.delete(historyId);
          return;
        }

        const result = await WhatsAppClientManager.sendMessage(accountId, phone, msg);
        results.push({ phone, ...result });

        if (result.success) {
          sent++;
          console.log(`[Broadcast] ✓ ${phone} (${sent}/${phoneNumbers.length})`);
        } else {
          failed++;
          console.error(`[Broadcast] ✗ ${phone}: ${result.error}`);
        }

        // Delay between messages (skip after last)
        if (i < phoneNumbers.length - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      // Write final record
      const finalRecord = {
        ...historyRecord,
        status: 'completed',
        completedAt: new Date().toISOString(),
        results,
        summary: { total: phoneNumbers.length, sent, failed },
      };
      fs.writeFileSync(historyFile, JSON.stringify(finalRecord, null, 2));
      console.log(`[Broadcast] Done ${historyId}: ${sent} sent, ${failed} failed`);
    });

    return NextResponse.json(
      {
        success: true,
        historyId,
        message: `Broadcast dimulai untuk ${phoneNumbers.length} nomor`,
        estimatedMinutes: Math.ceil((phoneNumbers.length * delayMs) / 60000),
      },
      { status: 202 }
    );
  } catch (err) {
    console.error('[POST /api/messages/send]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
