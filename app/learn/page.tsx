'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PoolStatus {
  current: number;
  target: number;
  spotsAvailable: number;
}

interface WordToLearn {
  id: number;
  kanji: string;
  reading: string;
  meaning: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  jlptLevel: string;
}

export default function LearnPage() {
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [currentWord, setCurrentWord] = useState<WordToLearn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ learned: 0, skipped: 0 });

  const fetchNextWord = useCallback(async () => {
    try {
      const response = await fetch('/api/learn');
      if (response.ok) {
        const data = await response.json();
        setPoolStatus(data.poolStatus);
        setCurrentWord(data.nextWord);
        
        // Generate meaning if missing
        if (data.nextWord && !data.nextWord.meaning) {
          generateMeaning(data.nextWord);
        }
      }
    } catch (error) {
      console.error('Failed to fetch next word:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextWord();
  }, [fetchNextWord]);

  const generateMeaning = async (word: WordToLearn) => {
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
        setCurrentWord((prev) =>
          prev?.id === word.id
            ? {
                ...prev,
                meaning: data.meaning,
                exampleSentence: data.example_sentence,
                exampleTranslation: data.example_translation,
              }
            : prev
        );
      }
    } catch (error) {
      console.error('Failed to generate meaning:', error);
    }
  };

  const handleAction = async (action: 'learn' | 'skip') => {
    if (!currentWord || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: currentWord.id,
          action,
        }),
      });

      if (response.ok) {
        setSessionStats((prev) => ({
          learned: action === 'learn' ? prev.learned + 1 : prev.learned,
          skipped: action === 'skip' ? prev.skipped + 1 : prev.skipped,
        }));

        // Fetch next word
        setIsLoading(true);
        await fetchNextWord();
      }
    } catch (error) {
      console.error('Failed to process action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Pool is full
  if (poolStatus && poolStatus.spotsAvailable === 0) {
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
            <div className="text-6xl">✓</div>
            <h2 className="text-2xl font-bold">Pool is Full!</h2>
            <p className="text-muted-foreground">
              Your active word pool has {poolStatus.current} words. 
              Master some words in review to make room for new ones.
            </p>
            
            {sessionStats.learned + sessionStats.skipped > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">This session:</p>
                <p className="font-medium">
                  {sessionStats.learned} learned, {sessionStats.skipped} skipped
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Link href="/review">
                <Button>Start Review</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // No more words available
  if (!currentWord) {
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

        <main className="container mx-auto px-4 py-8 max-w-lg text-center space-y-6">
          <h2 className="text-2xl font-bold">No More Words</h2>
          <p className="text-muted-foreground">
            You&apos;ve gone through all available words in your selected JLPT levels!
          </p>
          <Link href="/settings">
            <Button>Adjust Settings</Button>
          </Link>
        </main>
      </div>
    );
  }

  const poolProgress = poolStatus 
    ? (poolStatus.current / poolStatus.target) * 100 
    : 0;

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
            Pool: {poolStatus?.current}/{poolStatus?.target}
          </div>
          <div className="text-sm">
            <span className="text-green-600">+{sessionStats.learned}</span>
            {' / '}
            <span className="text-muted-foreground">{sessionStats.skipped} skipped</span>
          </div>
        </div>
      </header>

      {/* Pool Progress */}
      <div className="container mx-auto px-4 py-2">
        <Progress value={poolProgress} className="h-2" />
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="space-y-6">
          {/* Instruction */}
          <p className="text-center text-muted-foreground">
            Do you want to learn this word?
          </p>

          {/* Word Card */}
          <Card>
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <Badge variant="secondary">{currentWord.jlptLevel}</Badge>
              </div>

              {/* Kanji */}
              <div className="text-center mb-6">
                <p className="text-6xl font-bold mb-4">{currentWord.kanji}</p>
                <p className="text-2xl text-primary">{currentWord.reading}</p>
              </div>

              {/* Meaning */}
              <div className="text-center border-t pt-4">
                {currentWord.meaning ? (
                  <p className="text-lg">{currentWord.meaning}</p>
                ) : (
                  <p className="text-muted-foreground italic">Loading meaning...</p>
                )}
              </div>

              {/* Example */}
              {currentWord.exampleSentence && (
                <div className="bg-muted rounded-lg p-4 mt-4">
                  <p className="text-lg mb-2">{currentWord.exampleSentence}</p>
                  {currentWord.exampleTranslation && (
                    <p className="text-sm text-muted-foreground">
                      {currentWord.exampleTranslation}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAction('skip')}
              disabled={isProcessing}
              className="h-16"
            >
              <div className="text-center">
                <p className="font-semibold">Already Know</p>
                <p className="text-xs text-muted-foreground">Skip this word</p>
              </div>
            </Button>
            
            <Button
              size="lg"
              onClick={() => handleAction('learn')}
              disabled={isProcessing}
              className="h-16 bg-green-600 hover:bg-green-700"
            >
              <div className="text-center">
                <p className="font-semibold">Learn This</p>
                <p className="text-xs opacity-80">Add to pool</p>
              </div>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
