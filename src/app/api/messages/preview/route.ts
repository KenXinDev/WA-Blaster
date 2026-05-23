import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      messageTemplate?: string;
      sampleData?: Record<string, string>;
    };

    const { messageTemplate, sampleData } = body;
    if (!messageTemplate) {
      return NextResponse.json({ error: 'messageTemplate is required' }, { status: 400 });
    }

    const preview = replacePlaceholders(messageTemplate, sampleData ?? {});
    return NextResponse.json({ preview });
  } catch (err) {
    console.error('[POST /api/messages/preview]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
