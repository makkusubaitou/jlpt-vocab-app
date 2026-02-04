'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface Settings {
  id: number;
  activePoolSize: number;
  selectedLevels: string;
}

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function SettingsPage() {
  const [, setSettings] = useState<Settings | null>(null);
  const [poolSize, setPoolSize] = useState(50);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(JLPT_LEVELS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setPoolSize(data.activePoolSize);
        setSelectedLevels(data.selectedLevels.split(','));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePoolSizeChange = (value: number[]) => {
    setPoolSize(value[0]);
    setHasChanges(true);
  };

  const handleLevelToggle = (level: string) => {
    setSelectedLevels((prev) => {
      const newLevels = prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level];
      
      // Ensure at least one level is selected
      if (newLevels.length === 0) return prev;
      
      setHasChanges(true);
      return newLevels;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePoolSize: poolSize,
          selectedLevels: selectedLevels.sort().join(','),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
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
          <h1 className="font-semibold">Settings</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        {/* Pool Size Setting */}
        <Card>
          <CardHeader>
            <CardTitle>Active Word Pool</CardTitle>
            <CardDescription>
              How many words to keep in your active learning queue. When you master a word, a new one will be added automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Pool Size</Label>
                <span className="text-2xl font-bold">{poolSize}</span>
              </div>
              <Slider
                value={[poolSize]}
                onValueChange={handlePoolSizeChange}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 (relaxed)</span>
                <span>50 (moderate)</span>
                <span>100 (intensive)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JLPT Level Selection */}
        <Card>
          <CardHeader>
            <CardTitle>JLPT Levels</CardTitle>
            <CardDescription>
              Choose which JLPT levels to draw new words from. Words are added in order from easiest to hardest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {JLPT_LEVELS.map((level) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={level}
                      checked={selectedLevels.includes(level)}
                      onCheckedChange={() => handleLevelToggle(level)}
                    />
                    <Label htmlFor={level} className="text-base font-medium">
                      {level}
                    </Label>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {level === 'N5' && '~800 words'}
                    {level === 'N4' && '~700 words'}
                    {level === 'N3' && '~2100 words'}
                    {level === 'N2' && '~1900 words'}
                    {level === 'N1' && '~2700 words'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </main>
    </div>
  );
}
