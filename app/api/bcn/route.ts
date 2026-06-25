import { NextRequest, NextResponse } from 'next/server';
import { buscarMarcoLegal, buscarArticulos } from '@/lib/bcnScraper';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const ley = searchParams.get('ley') || '';

  try {
    if (ley) {
      const result = await buscarArticulos(ley);
      return NextResponse.json(result);
    }
    if (q) {
      const result = await buscarMarcoLegal(q);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Especifica ?q= o ?ley=' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
