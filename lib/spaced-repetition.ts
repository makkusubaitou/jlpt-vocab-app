import { addHours, addDays } from 'date-fns';

export type ReviewResponse = 'forgot' | 'shaky' | 'got_it';

interface ReviewResult {
  nextReview: Date;
  comfortLevel: number;
}

export function calculateNextReview(
  response: ReviewResponse,
  currentComfort: number
): ReviewResult {
  const now = new Date();
  
  switch (response) {
    case 'forgot':
      // Reset comfort level and review in 1 hour
      return {
        nextReview: addHours(now, 1),
        comfortLevel: 1,
      };
    
    case 'shaky':
      // Keep comfort level, review tomorrow
      return {
        nextReview: addDays(now, 1),
        comfortLevel: Math.max(currentComfort, 1),
      };
    
    case 'got_it':
      // Increase comfort level, review in (comfort * 2) days
      const newComfort = Math.min(currentComfort + 1, 5);
      return {
        nextReview: addDays(now, newComfort * 2),
        comfortLevel: newComfort,
      };
  }
}

export function getReviewIntervalText(comfortLevel: number): string {
  if (comfortLevel <= 0) return 'New';
  if (comfortLevel === 1) return '2 days';
  if (comfortLevel === 2) return '4 days';
  if (comfortLevel === 3) return '6 days';
  if (comfortLevel === 4) return '8 days';
  return '10 days';
}
