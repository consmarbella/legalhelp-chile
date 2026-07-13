import { NextResponse } from 'next/server';
import { activeProvider } from '@/lib/llm';

export async function GET() {
  return NextResponse.json({
    provider: activeProvider(),
    model: 'deepseek-chat',
    keySet: !!process.env.DEEPSEEK_API_KEY,
  });
}
