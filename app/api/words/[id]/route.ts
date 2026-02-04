import { NextRequest, NextResponse } from 'next/server';
import { db, words } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wordId = parseInt(id);
    
    if (isNaN(wordId)) {
      return NextResponse.json(
        { error: 'Invalid word ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { meaning, exampleSentence, exampleTranslation } = body;

    const result = await db
      .update(words)
      .set({
        ...(meaning !== undefined && { meaning }),
        ...(exampleSentence !== undefined && { exampleSentence }),
        ...(exampleTranslation !== undefined && { exampleTranslation }),
      })
      .where(eq(words.id, wordId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating word:', error);
    return NextResponse.json(
      { error: 'Failed to update word' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wordId = parseInt(id);
    
    if (isNaN(wordId)) {
      return NextResponse.json(
        { error: 'Invalid word ID' },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(words)
      .where(eq(words.id, wordId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching word:', error);
    return NextResponse.json(
      { error: 'Failed to fetch word' },
      { status: 500 }
    );
  }
}
