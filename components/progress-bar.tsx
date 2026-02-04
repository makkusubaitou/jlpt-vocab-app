'use client';

interface JlptProgressBarProps {
  level: string;
  total: number;
  known: number;
  active: number;
}

export function JlptProgressBar({ level, total, known, active }: JlptProgressBarProps) {
  const knownPercent = total > 0 ? (known / total) * 100 : 0;
  const activePercent = total > 0 ? (active / total) * 100 : 0;
  
  // Level colors
  const levelColors: Record<string, string> = {
    N5: 'bg-green-500',
    N4: 'bg-blue-500',
    N3: 'bg-yellow-500',
    N2: 'bg-orange-500',
    N1: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-lg">{level}</span>
        <span className="text-sm text-muted-foreground">
          {known + active} / {total} words
        </span>
      </div>
      
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
        {/* Known words (completed) */}
        <div
          className={`absolute h-full ${levelColors[level]} transition-all`}
          style={{ width: `${knownPercent}%` }}
        />
        {/* Active words (in progress) */}
        <div
          className={`absolute h-full ${levelColors[level]} opacity-50 transition-all`}
          style={{ left: `${knownPercent}%`, width: `${activePercent}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{known} mastered</span>
        <span>{active} learning</span>
        <span>{total - known - active} remaining</span>
      </div>
    </div>
  );
}

interface ProgressStatsProps {
  dueForReview: number;
  totalLearned: number;
}

export function ProgressStats({ dueForReview, totalLearned }: ProgressStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border bg-card p-4 text-center">
        <p className="text-3xl font-bold">{dueForReview}</p>
        <p className="text-sm text-muted-foreground">Words due today</p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-center">
        <p className="text-3xl font-bold">{totalLearned}</p>
        <p className="text-sm text-muted-foreground">Total learned</p>
      </div>
    </div>
  );
}
