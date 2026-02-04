import { NextRequest, NextResponse } from 'next/server';
import { db, words, userProgress } from '@/lib/db';
import { eq, or, ilike, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query && !level) {
      return NextResponse.json([]);
    }

    // Build the search query
    const conditions = [];
    
    if (query) {
      conditions.push(
        or(
          ilike(words.kanji, `%${query}%`),
          ilike(words.reading, `%${query}%`),
          ilike(words.meaning, `%${query}%`)
        )
      );
    }

    if (level) {
      conditions.push(eq(words.jlptLevel, level));
    }

    // Execute search with progress info
    const results = await db
      .select({
        id: words.id,
        kanji: words.kanji,
        reading: words.reading,
        meaning: words.meaning,
        jlptLevel: words.jlptLevel,
        isCustom: words.isCustom,
        status: userProgress.status,
        comfortLevel: userProgress.comfortLevel,
      })
      .from(words)
      .leftJoin(userProgress, eq(words.id, userProgress.wordId))
      .where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`)
      .limit(limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching words:', error);
    return NextResponse.json(
      { error: 'Failed to search words' },
      { status: 500 }
    );
  }
}
