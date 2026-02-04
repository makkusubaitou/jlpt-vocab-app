import { NextResponse } from 'next/server';
import { db, words, userProgress } from '@/lib/db';
import { eq, sql, and, or, lte, isNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total words per JLPT level
    const totalByLevel = await db
      .select({
        jlptLevel: words.jlptLevel,
        total: sql<number>`count(*)::int`,
      })
      .from(words)
      .groupBy(words.jlptLevel);

    // Get known words per JLPT level (status = 'known' or 'skipped')
    const knownByLevel = await db
      .select({
        jlptLevel: words.jlptLevel,
        known: sql<number>`count(*)::int`,
      })
      .from(userProgress)
      .innerJoin(words, eq(userProgress.wordId, words.id))
      .where(
        or(
          eq(userProgress.status, 'known'),
          eq(userProgress.status, 'skipped')
        )
      )
      .groupBy(words.jlptLevel);

    // Get active words per JLPT level
    const activeByLevel = await db
      .select({
        jlptLevel: words.jlptLevel,
        active: sql<number>`count(*)::int`,
      })
      .from(userProgress)
      .innerJoin(words, eq(userProgress.wordId, words.id))
      .where(eq(userProgress.status, 'active'))
      .groupBy(words.jlptLevel);

    // Get words due for review
    const now = new Date();
    const dueForReview = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.status, 'active'),
          or(
            lte(userProgress.nextReview, now),
            isNull(userProgress.nextReview)
          )
        )
      );

    // Get total learned (active + known)
    const totalLearned = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(userProgress)
      .where(
        or(
          eq(userProgress.status, 'active'),
          eq(userProgress.status, 'known')
        )
      );

    // Combine the data
    const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const progress = levels.map((level) => {
      const total = totalByLevel.find((t) => t.jlptLevel === level)?.total || 0;
      const known = knownByLevel.find((k) => k.jlptLevel === level)?.known || 0;
      const active = activeByLevel.find((a) => a.jlptLevel === level)?.active || 0;
      
      return {
        level,
        total,
        known,
        active,
        notStarted: total - known - active,
      };
    });

    return NextResponse.json({
      progress,
      stats: {
        dueForReview: dueForReview[0]?.count || 0,
        totalLearned: totalLearned[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wordId, status } = body;

    if (!wordId || !status) {
      return NextResponse.json(
        { error: 'wordId and status are required' },
        { status: 400 }
      );
    }

    // Insert or update progress
    const result = await db
      .insert(userProgress)
      .values({
        wordId,
        status,
        comfortLevel: 0,
        reviewCount: 0,
        nextReview: new Date(),
      })
      .onConflictDoUpdate({
        target: userProgress.wordId,
        set: {
          status,
        },
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating progress:', error);
    return NextResponse.json(
      { error: 'Failed to create progress' },
      { status: 500 }
    );
  }
}
