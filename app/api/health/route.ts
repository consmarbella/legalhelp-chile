import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    model: 'gemini-2.5-flash',
    keySet: !!process.env.GEMINI_API_KEY,
  });
}
