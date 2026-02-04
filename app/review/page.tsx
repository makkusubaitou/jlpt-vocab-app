'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordCard } from '@/components/word-card';
import { ReviewButtons } from '@/components/review-buttons';
import { ConfirmModal } from '@/components/confirm-modal';

interface ReviewWord {
  id: number;
  kanji: string;
  reading: string;
  meaning: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  jlptLevel: string;
  progressId: number;
  status: string;
  comfortLevel: number | null;
  reviewCount: number | null;
}

interface PoolStatus {
  current: number;
  target: number;
  spotsAvailable: number;
}

export default function ReviewPage() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const router = useRouter();

  const fetchWords = useCallback(async () => {
    try {
      const response = await fetch('/api/words?forReview=true&limit=50');
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (error) {
      console.error('Failed to fetch words:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const currentWord = words[currentIndex];

  const generateMeaning = async (word: ReviewWord) => {
    if (word.meaning) return;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kanji: word.kanji,
          reading: word.reading,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the word in the database
        await fetch(`/api/words/${word.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meaning: data.meaning,
            exampleSentence: data.example_sentence,
            exampleTranslation: data.example_translation,
          }),
        });

        // Update local state
        setWords((prev) =>
          prev.map((w) =>
            w.id === word.id
              ? {
                  ...w,
                  meaning: data.meaning,
                  exampleSentence: data.example_sentence,
                  exampleTranslation: data.example_translation,
                }
              : w
          )
        );
      }
    } catch (error) {
      console.error('Failed to generate meaning:', error);
    }
  };

  const handleReveal = async () => {
    setIsRevealed(true);
    // Generate meaning if missing
    if (currentWord && !currentWord.meaning) {
      await generateMeaning(currentWord);
    }
  };

  const handleResponse = async (response: 'forgot' | 'shaky' | 'got_it') => {
    if (!currentWord || isProcessing) return;

    setIsProcessing(true);
    try {
      await fetch(`/api/progress/${currentWord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: response === 'got_it' ? prev.correct + 1 : prev.correct,
      }));

      // Move to next word
      if (currentIndex < words.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsRevealed(false);
      } else {
        // Session complete - check pool status
        try {
          const learnRes = await fetch('/api/learn');
          if (learnRes.ok) {
            const data = await learnRes.json();
            setPoolStatus(data.poolStatus);
          }
        } catch (error) {
          console.error('Failed to fetch pool status:', error);
        }
        setSessionComplete(true);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!currentWord || isProcessing) return;

    setIsProcessing(true);
    try {
      await fetch(`/api/progress/${currentWord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      });

      // Remove from current session and move on
      setWords((prev) => prev.filter((w) => w.id !== currentWord.id));
      setShowSkipModal(false);
      setIsRevealed(false);
      
      // Don't increment index since we removed the current word
      if (words.length <= 1) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to skip word:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading review session...</p>
      </div>
    );
  }

  // Session complete screen
  if (sessionComplete) {
    const needsRefill = poolStatus && poolStatus.spotsAvailable > 0;
    
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-lg">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-green-600">{sessionStats.correct}</p>
                    <p className="text-sm text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{sessionStats.reviewed}</p>
                    <p className="text-sm text-muted-foreground">Reviewed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {needsRefill && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="p-6 space-y-4">
                  <p className="font-medium">
                    Your word pool has {poolStatus.spotsAvailable} spot{poolStatus.spotsAvailable !== 1 ? 's' : ''} available!
                  </p>
                  <Link href="/learn">
                    <Button className="w-full bg-amber-600 hover:bg-amber-700">
                      Add New Words
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4 justify-center">
              <Link href="/">
                <Button variant="outline">Dashboard</Button>
              </Link>
              {!needsRefill && (
                <Link href="/learn">
                  <Button variant="outline">Learn More</Button>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h2 className="text-2xl font-bold">All caught up!</h2>
        <p className="text-muted-foreground text-center">
          No words due for review right now. Check back later or add more words to study.
        </p>
        <div className="flex gap-4">
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
          <Link href="/learn">
            <Button variant="outline">Learn New Words</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </div>
          <div className="text-sm">
            <span className="text-green-600">{sessionStats.correct}</span>
            {' / '}
            <span>{sessionStats.reviewed}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="space-y-8">
          {/* Word card */}
          {currentWord && (
            <WordCard
              kanji={currentWord.kanji}
              reading={currentWord.reading}
              meaning={currentWord.meaning}
              exampleSentence={currentWord.exampleSentence}
              exampleTranslation={currentWord.exampleTranslation}
              jlptLevel={currentWord.jlptLevel}
              comfortLevel={currentWord.comfortLevel || 0}
              isRevealed={isRevealed}
              onReveal={handleReveal}
            />
          )}

          {/* Review buttons - only show when revealed */}
          {isRevealed && (
            <ReviewButtons
              onForgot={() => handleResponse('forgot')}
              onShaky={() => handleResponse('shaky')}
              onGotIt={() => handleResponse('got_it')}
              onAlreadyKnow={() => setShowSkipModal(true)}
              isLoading={isProcessing}
            />
          )}
        </div>
      </main>

      {/* Skip confirmation modal */}
      <ConfirmModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onConfirm={handleSkip}
        title="Mark as Known"
        description={`Are you sure you already know "${currentWord?.kanji}"? This will remove it from your review queue.`}
        confirmText="Yes, I know it"
        cancelText="Keep learning"
        isLoading={isProcessing}
      />
    </div>
  );
}
