'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading review session...</p>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [graduatedWord, setGraduatedWord] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';

  const fetchWords = useCallback(async () => {
    try {
      const params = isPractice
        ? 'practice=true&limit=50'
        : 'forReview=true&limit=50';
      const response = await fetch(`/api/words?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (error) {
      console.error('Failed to fetch words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isPractice]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const currentWord = words[currentIndex];

  const generateForWord = async (word: ReviewWord) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kanji: word.kanji,
          reading: word.reading,
          jlptLevel: word.jlptLevel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        await fetch(`/api/words/${word.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meaning: data.meaning,
            exampleSentence: data.example_sentence,
            exampleTranslation: data.example_translation,
          }),
        });

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
      console.error('Failed to generate:', error);
    }
  };

  const handleReveal = async () => {
    setIsRevealed(true);
    if (currentWord && !currentWord.meaning) {
      await generateForWord(currentWord);
    }
  };

  const handleGenerateExample = async () => {
    if (!currentWord) return;
    await generateForWord(currentWord);
  };

  const handleResponse = async (response: 'forgot' | 'shaky' | 'got_it') => {
    if (!currentWord || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/progress/${currentWord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const progressData = await res.json();

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: response === 'got_it' ? prev.correct + 1 : prev.correct,
      }));

      if (progressData.graduated) {
        setGraduatedWord(currentWord.kanji);
        setTimeout(() => setGraduatedWord(null), 2000);
      }

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
        <h2 className="text-2xl font-bold">
          {isPractice ? 'No words yet!' : 'All caught up!'}
        </h2>
        <p className="text-muted-foreground text-center">
          {isPractice
            ? 'You don\'t have any active words to practice. Start by learning some new words.'
            : 'No words due for review right now. Check back later or start a practice session.'}
        </p>
        <div className="flex gap-4">
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
          {!isPractice && (
            <Link href="/review?practice=true">
              <Button variant="outline">Practice Anyway</Button>
            </Link>
          )}
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
            {isPractice && <span className="mr-2 text-violet-600 dark:text-violet-400 font-medium">Practice</span>}
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
              onGenerateExample={handleGenerateExample}
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

      {/* Graduation toast */}
      {graduatedWord && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-center animate-in fade-in slide-in-from-bottom-4 z-50">
          <p className="font-bold">{graduatedWord} mastered!</p>
          <p className="text-sm text-green-100">Moved to known words</p>
        </div>
      )}

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
