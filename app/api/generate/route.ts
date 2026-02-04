import { NextRequest, NextResponse } from 'next/server';
import { generateWordData } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kanji, reading } = body;

    if (!kanji || !reading) {
      return NextResponse.json(
        { error: 'kanji and reading are required' },
        { status: 400 }
      );
    }

    const data = await generateWordData(kanji, reading);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating word data:', error);
    return NextResponse.json(
      { error: 'Failed to generate word data' },
      { status: 500 }
    );
  }
}
