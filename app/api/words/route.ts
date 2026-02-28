import { NextRequest, NextResponse } from 'next/server';
import { db, words, userProgress } from '@/lib/db';
import { eq, sql, and, or, lte, isNull, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forReview = searchParams.get('forReview') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const jlptLevel = searchParams.get('level');

    const practice = searchParams.get('practice') === 'true';

    if (forReview || practice) {
      const now = new Date();

      const whereClause = practice
        ? eq(userProgress.status, 'active')
        : and(
            eq(userProgress.status, 'active'),
            or(
              lte(userProgress.nextReview, now),
              isNull(userProgress.nextReview)
            )
          );

      const result = await db
        .select({
          id: words.id,
          kanji: words.kanji,
          reading: words.reading,
          meaning: words.meaning,
          exampleSentence: words.exampleSentence,
          exampleTranslation: words.exampleTranslation,
          jlptLevel: words.jlptLevel,
          progressId: userProgress.id,
          status: userProgress.status,
          comfortLevel: userProgress.comfortLevel,
          reviewCount: userProgress.reviewCount,
        })
        .from(userProgress)
        .innerJoin(words, eq(userProgress.wordId, words.id))
        .where(whereClause)
        .orderBy(sql`RANDOM()`)
        .limit(limit);

      return NextResponse.json(result);
    }

    // Get all words (optionally filtered by level)
    const query = db
      .select({
        id: words.id,
        kanji: words.kanji,
        reading: words.reading,
        meaning: words.meaning,
        exampleSentence: words.exampleSentence,
        exampleTranslation: words.exampleTranslation,
        jlptLevel: words.jlptLevel,
        isCustom: words.isCustom,
      })
      .from(words)
      .orderBy(desc(words.createdAt))
      .limit(limit);

    if (jlptLevel) {
      const result = await db
        .select({
          id: words.id,
          kanji: words.kanji,
          reading: words.reading,
          meaning: words.meaning,
          exampleSentence: words.exampleSentence,
          exampleTranslation: words.exampleTranslation,
          jlptLevel: words.jlptLevel,
          isCustom: words.isCustom,
        })
        .from(words)
        .where(eq(words.jlptLevel, jlptLevel))
        .orderBy(desc(words.createdAt))
        .limit(limit);
      
      return NextResponse.json(result);
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching words:', error);
    return NextResponse.json(
      { error: 'Failed to fetch words' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kanji, reading, meaning, exampleSentence, exampleTranslation, jlptLevel } = body;

    if (!kanji || !reading) {
      return NextResponse.json(
        { error: 'kanji and reading are required' },
        { status: 400 }
      );
    }

    const result = await db
      .insert(words)
      .values({
        kanji,
        reading,
        meaning,
        exampleSentence,
        exampleTranslation,
        jlptLevel: jlptLevel || 'Custom',
        isCustom: true,
      })
      .returning();

    // Automatically add to user progress as active
    await db.insert(userProgress).values({
      wordId: result[0].id,
      status: 'active',
      comfortLevel: 0,
      reviewCount: 0,
      nextReview: new Date(),
    });

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating word:', error);
    return NextResponse.json(
      { error: 'Failed to create word' },
      { status: 500 }
    );
  }
}
