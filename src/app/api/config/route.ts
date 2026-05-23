import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data', 'config');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const DEFAULT_CONFIG = {
  delayMin: 20,
  delayMax: 40,
  maxRetries: 3,
  logLevel: 'info',
};

function getConfigFile(userId: string) {
  return path.join(CONFIG_DIR, `${userId}_config.json`);
}

function loadConfig(userId: string) {
  const file = getConfigFile(userId);
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf-8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = loadConfig(session.user.id);
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[GET /api/config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      delayMin?: number;
      delayMax?: number;
      maxRetries?: number;
      logLevel?: string;
    };

    const current = loadConfig(session.user.id);
    const updated = {
      ...current,
      ...(body.delayMin !== undefined && { delayMin: Math.max(5, Math.min(120, body.delayMin)) }),
      ...(body.delayMax !== undefined && { delayMax: Math.max(10, Math.min(300, body.delayMax)) }),
      ...(body.maxRetries !== undefined && { maxRetries: Math.max(0, Math.min(10, body.maxRetries)) }),
      ...(body.logLevel !== undefined && { logLevel: body.logLevel }),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(getConfigFile(session.user.id), JSON.stringify(updated, null, 2));

    return NextResponse.json({ config: updated });
  } catch (err) {
    console.error('[PUT /api/config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
