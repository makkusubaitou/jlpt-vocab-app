import { NextResponse } from 'next/server';
import { db, words, userProgress, userSettings } from '@/lib/db';
import { eq, notInArray, inArray, sql, and } from 'drizzle-orm';

// Get pool status and next word to learn
export async function GET() {
  try {
    // Get settings
    let settings = await db.select().from(userSettings).limit(1);
    
    if (settings.length === 0) {
      // Create default settings
      const newSettings = await db
        .insert(userSettings)
        .values({
          activePoolSize: 50,
          selectedLevels: 'N5,N4,N3,N2,N1',
        })
        .returning();
      settings = newSettings;
    }

    const { activePoolSize, selectedLevels } = settings[0];
    const levels = selectedLevels.split(',');

    // Count current active words
    const activeCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userProgress)
      .where(eq(userProgress.status, 'active'));

    const currentPoolSize = activeCount[0]?.count || 0;
    const spotsAvailable = Math.max(0, activePoolSize - currentPoolSize);

    // If pool is full, no need to fetch a word
    if (spotsAvailable === 0) {
      return NextResponse.json({
        poolStatus: {
          current: currentPoolSize,
          target: activePoolSize,
          spotsAvailable: 0,
        },
        nextWord: null,
      });
    }

    // Get IDs of words already in progress (any status)
    const progressedWordIds = await db
      .select({ wordId: userProgress.wordId })
      .from(userProgress);

    const excludeIds = progressedWordIds.map((p) => p.wordId);

    // Get next word that:
    // 1. Is in selected JLPT levels
    // 2. Is not already in user_progress
    // Order by level (N5 first) then by id
    const nextWordQuery = db
      .select({
        id: words.id,
        kanji: words.kanji,
        reading: words.reading,
        meaning: words.meaning,
        exampleSentence: words.exampleSentence,
        exampleTranslation: words.exampleTranslation,
        jlptLevel: words.jlptLevel,
      })
      .from(words)
      .where(
        and(
          inArray(words.jlptLevel, levels),
          excludeIds.length > 0 
            ? notInArray(words.id, excludeIds)
            : sql`true`
        )
      )
      .orderBy(
        sql`CASE 
          WHEN ${words.jlptLevel} = 'N5' THEN 1
          WHEN ${words.jlptLevel} = 'N4' THEN 2
          WHEN ${words.jlptLevel} = 'N3' THEN 3
          WHEN ${words.jlptLevel} = 'N2' THEN 4
          WHEN ${words.jlptLevel} = 'N1' THEN 5
          ELSE 6
        END`,
        words.id
      )
      .limit(1);

    const nextWord = await nextWordQuery;

    return NextResponse.json({
      poolStatus: {
        current: currentPoolSize,
        target: activePoolSize,
        spotsAvailable,
      },
      nextWord: nextWord[0] || null,
    });
  } catch (error) {
    console.error('Error fetching learn data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learn data' },
      { status: 500 }
    );
  }
}

// Add word to pool (learn) or skip it
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wordId, action } = body; // action: 'learn' or 'skip'

    if (!wordId || !action) {
      return NextResponse.json(
        { error: 'wordId and action are required' },
        { status: 400 }
      );
    }

    if (action === 'learn') {
      // Add to active pool
      await db.insert(userProgress).values({
        wordId,
        status: 'active',
        comfortLevel: 0,
        reviewCount: 0,
        nextReview: new Date(), // Due immediately for first review
      });
    } else if (action === 'skip') {
      // Mark as skipped (already known)
      await db.insert(userProgress).values({
        wordId,
        status: 'skipped',
        comfortLevel: 5, // Max comfort since they know it
        reviewCount: 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing learn action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
