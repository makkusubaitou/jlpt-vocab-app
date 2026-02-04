'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WordCardProps {
  kanji: string;
  reading: string;
  meaning?: string | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  jlptLevel: string;
  comfortLevel?: number;
  isRevealed: boolean;
  onReveal: () => void;
}

export function WordCard({
  kanji,
  reading,
  meaning,
  exampleSentence,
  exampleTranslation,
  jlptLevel,
  comfortLevel = 0,
  isRevealed,
  onReveal,
}: WordCardProps) {
  return (
    <Card
      className="w-full max-w-lg mx-auto cursor-pointer transition-all hover:shadow-lg"
      onClick={!isRevealed ? onReveal : undefined}
    >
      <CardContent className="p-8">
        {/* Level badge */}
        <div className="flex justify-between items-start mb-6">
          <Badge variant="secondary">{jlptLevel}</Badge>
          {comfortLevel > 0 && (
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < comfortLevel ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Kanji - always visible */}
        <div className="text-center mb-8">
          <p className="text-6xl font-bold mb-2">{kanji}</p>
          {!isRevealed && (
            <p className="text-sm text-muted-foreground mt-4">
              Tap to reveal
            </p>
          )}
        </div>

        {/* Revealed content */}
        {isRevealed && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Reading */}
            <div className="text-center">
              <p className="text-3xl text-primary">{reading}</p>
            </div>

            {/* Meaning */}
            {meaning && (
              <div className="text-center border-t pt-4">
                <p className="text-lg">{meaning}</p>
              </div>
            )}

            {/* Example sentence */}
            {exampleSentence && (
              <div className="bg-muted rounded-lg p-4 mt-4">
                <p className="text-lg mb-2">{exampleSentence}</p>
                {exampleTranslation && (
                  <p className="text-sm text-muted-foreground">
                    {exampleTranslation}
                  </p>
                )}
              </div>
            )}

            {/* Missing content notice */}
            {!meaning && (
              <p className="text-sm text-muted-foreground text-center italic">
                Meaning not yet generated
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
