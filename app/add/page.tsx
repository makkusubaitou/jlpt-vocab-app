'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddWordPage() {
  const [kanji, setKanji] = useState('');
  const [reading, setReading] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedData, setGeneratedData] = useState<{
    meaning: string;
    example_sentence: string;
    example_translation: string;
  } | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!kanji || !reading) {
      setError('Kanji and reading are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanji, reading }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      setGeneratedData(data);
    } catch {
      setError('Failed to generate meaning. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kanji || !reading) {
      setError('Kanji and reading are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // If no generated data yet, generate it first
      let wordData = generatedData;
      if (!wordData) {
        const genResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kanji, reading }),
        });

        if (genResponse.ok) {
          wordData = await genResponse.json();
        }
      }

      // Create the word
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kanji,
          reading,
          meaning: wordData?.meaning,
          exampleSentence: wordData?.example_sentence,
          exampleTranslation: wordData?.example_translation,
          jlptLevel: 'Custom',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create word');
      }

      router.push('/search');
    } catch {
      setError('Failed to add word. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="font-semibold">Add Custom Word</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Add a New Word</CardTitle>
            <CardDescription>
              Enter the kanji and reading, and we&apos;ll generate the meaning and example sentence for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kanji">Kanji / Word</Label>
                  <Input
                    id="kanji"
                    value={kanji}
                    onChange={(e) => setKanji(e.target.value)}
                    placeholder="e.g., 食べる"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reading">Reading (Hiragana)</Label>
                  <Input
                    id="reading"
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="e.g., たべる"
                    required
                  />
                </div>
              </div>

              {/* Generate preview button */}
              {!generatedData && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isLoading || !kanji || !reading}
                  className="w-full"
                >
                  {isLoading ? 'Generating...' : 'Preview Meaning'}
                </Button>
              )}

              {/* Generated preview */}
              {generatedData && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Meaning</p>
                    <p>{generatedData.meaning}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Example</p>
                    <p>{generatedData.example_sentence}</p>
                    <p className="text-sm text-muted-foreground">
                      {generatedData.example_translation}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Word'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
