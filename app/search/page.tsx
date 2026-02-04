'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/search-input';

interface SearchResult {
  id: number;
  kanji: string;
  reading: string;
  meaning: string | null;
  jlptLevel: string;
  isCustom: boolean | null;
  status: string | null;
  comfortLevel: number | null;
}

type WordStatus = 'active' | 'known' | 'skipped' | null;

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query && !selectedLevel) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedLevel) params.set('level', selectedLevel);

      const response = await fetch(`/api/words/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel]);

  const handleStatusChange = async (wordId: number, newStatus: WordStatus) => {
    try {
      if (newStatus === null) {
        // Remove from progress (not implemented - would need DELETE endpoint)
        return;
      }

      await fetch(`/api/progress/${wordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      // Update local state
      setResults((prev) =>
        prev.map((r) =>
          r.id === wordId ? { ...r, status: newStatus } : r
        )
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Learning</Badge>;
      case 'known':
        return <Badge variant="secondary">Known</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline" className="opacity-50">Not started</Badge>;
    }
  };

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

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
          <h1 className="font-semibold">Search Words</h1>
          <Link href="/add">
            <Button size="sm">Add Custom</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Search input */}
        <SearchInput
          onSearch={handleSearch}
          placeholder="Search kanji, reading, or meaning..."
        />

        {/* Level filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedLevel === null ? 'default' : 'outline'}
            onClick={() => setSelectedLevel(null)}
          >
            All
          </Button>
          {levels.map((level) => (
            <Button
              key={level}
              size="sm"
              variant={selectedLevel === level ? 'default' : 'outline'}
              onClick={() => setSelectedLevel(level)}
            >
              {level}
            </Button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Searching...</p>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((word) => (
              <Card key={word.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold">{word.kanji}</span>
                        <span className="text-muted-foreground">{word.reading}</span>
                        <Badge variant="secondary" className="text-xs">
                          {word.jlptLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {word.meaning || 'No meaning yet'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(word.status)}
                      
                      <div className="flex gap-1">
                        {word.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(word.id, 'active')}
                          >
                            Study
                          </Button>
                        )}
                        {word.status !== 'known' && word.status !== 'skipped' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(word.id, 'skipped')}
                          >
                            Skip
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No words found</p>
            <Link href="/add">
              <Button variant="outline">Add custom word</Button>
            </Link>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Start typing to search words
          </p>
        )}
      </main>
    </div>
  );
}
