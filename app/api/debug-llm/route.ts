import { NextResponse } from 'next/server';
import { llmComplete, activeProvider } from '@/lib/llm';

export async function GET() {
  const start = Date.now();
  const result = await llmComplete({
    system: 'Responde SOLO JSON.',
    messages: [{ role: 'user', content: 'Di {"status":"ok"}' }],
    maxTokens: 50,
    temperature: 0,
  });
  return NextResponse.json({
    provider: activeProvider(),
    elapsed_ms: Date.now() - start,
    response: result,
    working: !!result,
  });
}
