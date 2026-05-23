import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { WhatsAppClientManager } from '@/lib/whatsapp/client';
import * as fs from 'fs';
import * as path from 'path';

const ACCOUNTS_DIR = path.join(process.cwd(), 'data', 'accounts');

if (!fs.existsSync(ACCOUNTS_DIR)) {
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
}

function getAccountsFile(userId: string) {
  return path.join(ACCOUNTS_DIR, `${userId}_accounts.json`);
}

function loadAccounts(userId: string): any[] {
  const file = getAccountsFile(userId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccounts(userId: string, accounts: any[]) {
  fs.writeFileSync(getAccountsFile(userId), JSON.stringify(accounts, null, 2));
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = loadAccounts(session.user.id);

    // Merge with live WhatsApp status
    const accountsWithStatus = accounts.map((account: any) => {
      const liveInfo = WhatsAppClientManager.getAccountInfo(account.id);
      return {
        ...account,
        status: liveInfo.status,
        phoneNumber: liveInfo.phoneNumber || account.phoneNumber,
        qrDataUrl: liveInfo.qrDataUrl,
        lastConnected: liveInfo.lastConnected || account.lastConnected,
        isInitializing: liveInfo.isInitializing,
      };
    });

    // If no accounts, return default account
    if (accountsWithStatus.length === 0) {
      const defaultInfo = WhatsAppClientManager.getAccountInfo('default');
      accountsWithStatus.push({
        id: 'default',
        displayName: 'WhatsApp Utama',
        userId: session.user.id,
        createdAt: new Date().toISOString(),
        status: defaultInfo.status,
        phoneNumber: defaultInfo.phoneNumber,
        qrDataUrl: defaultInfo.qrDataUrl,
        lastConnected: defaultInfo.lastConnected,
        isInitializing: defaultInfo.isInitializing,
      });
    }

    return NextResponse.json({ success: true, accounts: accountsWithStatus });
  } catch (err) {
    console.error('[GET /api/whatsapp/accounts]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { displayName?: string };
    const displayName = body.displayName?.trim();
    if (!displayName) {
      return NextResponse.json({ success: false, error: 'displayName is required' }, { status: 400 });
    }

    const accounts = loadAccounts(session.user.id);
    const newAccount = {
      id: `account_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      displayName,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      phoneNumber: null,
      lastConnected: null,
    };

    accounts.push(newAccount);
    saveAccounts(session.user.id, accounts);

    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/whatsapp/accounts]', err);
    return NextResponse.json({ success: false, error: 'Failed to create account' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId is required' }, { status: 400 });
    }

    // Disconnect first
    await WhatsAppClientManager.logoutAccount(accountId);
    await WhatsAppClientManager.cleanupSession(accountId);

    // Remove from accounts list
    const accounts = loadAccounts(session.user.id);
    const filtered = accounts.filter((a: any) => a.id !== accountId);
    saveAccounts(session.user.id, filtered);

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/whatsapp/accounts]', err);
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
