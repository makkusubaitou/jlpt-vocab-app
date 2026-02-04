'use client';

import { Button } from '@/components/ui/button';

interface ReviewButtonsProps {
  onForgot: () => void;
  onShaky: () => void;
  onGotIt: () => void;
  onAlreadyKnow: () => void;
  isLoading?: boolean;
}

export function ReviewButtons({
  onForgot,
  onShaky,
  onGotIt,
  onAlreadyKnow,
  isLoading = false,
}: ReviewButtonsProps) {
  return (
    <div className="space-y-4">
      {/* Main review buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="destructive"
          size="lg"
          onClick={onForgot}
          disabled={isLoading}
          className="h-16"
        >
          <div className="text-center">
            <p className="font-semibold">Forgot</p>
            <p className="text-xs opacity-80">1 hour</p>
          </div>
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={onShaky}
          disabled={isLoading}
          className="h-16"
        >
          <div className="text-center">
            <p className="font-semibold">Shaky</p>
            <p className="text-xs opacity-80">1 day</p>
          </div>
        </Button>
        
        <Button
          variant="default"
          size="lg"
          onClick={onGotIt}
          disabled={isLoading}
          className="h-16 bg-green-600 hover:bg-green-700"
        >
          <div className="text-center">
            <p className="font-semibold">Got it</p>
            <p className="text-xs opacity-80">+2 days</p>
          </div>
        </Button>
      </div>

      {/* Already know button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAlreadyKnow}
        disabled={isLoading}
        className="w-full text-muted-foreground"
      >
        I already know this word
      </Button>
    </div>
  );
}
