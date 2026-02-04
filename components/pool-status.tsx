'use client';

import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface PoolStatusProps {
  current: number;
  target: number;
  spotsAvailable: number;
}

export function PoolStatus({ current, target, spotsAvailable }: PoolStatusProps) {
  const progress = (current / target) * 100;
  const needsRefill = spotsAvailable > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Active Word Pool</span>
        <span className="text-sm text-muted-foreground">
          {current} / {target}
        </span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {needsRefill ? (
        <div className="flex justify-between items-center">
          <span className="text-sm text-amber-600">
            {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
          </span>
          <Link href="/learn">
            <Button size="sm" variant="outline">
              Add Words
            </Button>
          </Link>
        </div>
      ) : (
        <p className="text-sm text-green-600">Pool is full</p>
      )}
    </div>
  );
}
