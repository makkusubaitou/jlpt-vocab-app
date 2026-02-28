'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JlptProgressBar, ProgressStats } from '@/components/progress-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { PoolStatus } from '@/components/pool-status';

interface ProgressData {
  level: string;
  total: number;
  known: number;
  active: number;
  notStarted: number;
}

interface DashboardData {
  progress: ProgressData[];
  stats: {
    dueForReview: number;
    totalLearned: number;
  };
}

interface PoolData {
  current: number;
  target: number;
  spotsAvailable: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [progressRes, learnRes] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/learn'),
      ]);

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setData(progressData);
      }

      if (learnRes.ok) {
        const learnData = await learnRes.json();
        setPoolData(learnData.poolStatus);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">JLPT Vocab</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Pool Status */}
        {poolData && (
          <PoolStatus
            current={poolData.current}
            target={poolData.target}
            spotsAvailable={poolData.spotsAvailable}
          />
        )}

        {/* Quick Stats */}
        {data && (
          <ProgressStats
            dueForReview={data.stats.dueForReview}
            totalLearned={data.stats.totalLearned}
          />
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/review" className="block">
            <Button className="w-full h-16 text-lg" size="lg">
              Start Review
              {data && data.stats.dueForReview > 0 && (
                <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-sm">
                  {data.stats.dueForReview}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/learn" className="block">
            <Button variant="outline" className="w-full h-16 text-lg" size="lg">
              Learn New
              {poolData && poolData.spotsAvailable > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 rounded-full px-2 py-0.5 text-sm">
                  +{poolData.spotsAvailable}
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Practice Button */}
        <Link href="/review?practice=true" className="block">
          <Button variant="outline" className="w-full h-12 text-base border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950" size="lg">
            Practice All Words
          </Button>
        </Link>

        {/* Progress by Level */}
        <Card>
          <CardHeader>
            <CardTitle>Progress by Level</CardTitle>
            <CardDescription>
              Track your learning progress across all JLPT levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {data?.progress.map((item) => (
              <JlptProgressBar
                key={item.level}
                level={item.level}
                total={item.total}
                known={item.known}
                active={item.active}
              />
            ))}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/search">
            <Button variant="secondary" className="w-full">
              Search
            </Button>
          </Link>
          <Link href="/add">
            <Button variant="secondary" className="w-full">
              Add Word
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="secondary" className="w-full">
              Settings
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
