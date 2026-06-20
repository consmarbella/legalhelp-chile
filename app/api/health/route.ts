import { NextResponse } from 'next/server';
import { activeProvider } from '@/lib/llm';

// Diagnostico: que modelo/proveedor esta activo en runtime.
// NO expone la API key, solo si esta presente y cual proveedor se usa.
export async function GET() {
  const provider = activeProvider();
  return NextResponse.json({
    provider,
    model:
      provider === 'anthropic'
        ? process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'
        : provider === 'deepseek'
          ? 'deepseek-chat'
          : 'mock',
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    deepseekKeySet: !!process.env.DEEPSEEK_API_KEY,
  });
}
