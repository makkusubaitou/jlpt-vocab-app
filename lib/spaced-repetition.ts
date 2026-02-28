import { addHours, addDays } from 'date-fns';

export type ReviewResponse = 'forgot' | 'shaky' | 'got_it';

interface ReviewResult {
  nextReview: Date;
  comfortLevel: number;
}

const REVIEW_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8,
};

export function calculateNextReview(
  response: ReviewResponse,
  currentComfort: number
): ReviewResult {
  const now = new Date();
  
  switch (response) {
    case 'forgot':
      return {
        nextReview: addHours(now, 1),
        comfortLevel: 1,
      };
    
    case 'shaky':
      return {
        nextReview: addDays(now, 1),
        comfortLevel: Math.max(currentComfort, 1),
      };
    
    case 'got_it':
      const newComfort = Math.min(currentComfort + 1, 5);
      return {
        nextReview: addDays(now, REVIEW_INTERVALS[newComfort] ?? 8),
        comfortLevel: newComfort,
      };
  }
}

export function getReviewIntervalText(comfortLevel: number): string {
  if (comfortLevel <= 0) return 'New';
  const days = REVIEW_INTERVALS[comfortLevel];
  if (!days) return `${comfortLevel} days`;
  return days === 1 ? '1 day' : `${days} days`;
}
