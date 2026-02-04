import { NextRequest, NextResponse } from 'next/server';
import { db, userProgress } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { calculateNextReview, ReviewResponse } from '@/lib/spaced-repetition';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  try {
    const { wordId } = await params;
    const wordIdNum = parseInt(wordId);
    
    if (isNaN(wordIdNum)) {
      return NextResponse.json(
        { error: 'Invalid word ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { response, status } = body;

    // If status is provided directly (for skip/known actions)
    if (status) {
      const result = await db
        .update(userProgress)
        .set({ status })
        .where(eq(userProgress.wordId, wordIdNum))
        .returning();

      if (result.length === 0) {
        // Create new progress entry if it doesn't exist
        const newResult = await db
          .insert(userProgress)
          .values({
            wordId: wordIdNum,
            status,
            comfortLevel: status === 'known' ? 5 : 0,
            reviewCount: 0,
          })
          .returning();
        
        return NextResponse.json(newResult[0]);
      }

      return NextResponse.json(result[0]);
    }

    // If response is provided (for review actions)
    if (response) {
      // Get current progress
      const currentProgress = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.wordId, wordIdNum))
        .limit(1);

      if (currentProgress.length === 0) {
        return NextResponse.json(
          { error: 'Progress not found for this word' },
          { status: 404 }
        );
      }

      const current = currentProgress[0];
      const { nextReview, comfortLevel } = calculateNextReview(
        response as ReviewResponse,
        current.comfortLevel || 0
      );

      const result = await db
        .update(userProgress)
        .set({
          comfortLevel,
          nextReview,
          lastReviewed: new Date(),
          reviewCount: (current.reviewCount || 0) + 1,
        })
        .where(eq(userProgress.wordId, wordIdNum))
        .returning();

      return NextResponse.json(result[0]);
    }

    return NextResponse.json(
      { error: 'Either response or status is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
