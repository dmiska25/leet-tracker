import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Solve } from '@/types/types';
import {
  type TimelineEvent,
  buildTimelineEvents,
  formatSnapshotTime,
  formatElapsedTime,
} from '@/domain/timelineProcessing';

/* ---------------------------------------------------------- */
/*  Types                                                     */
/* ---------------------------------------------------------- */

interface CodeTimelineProps {
  solve: Solve;
  onCodeChange: (_code: string) => void;
  currentSnapshot: number;
  setCurrentSnapshot: (_snapshot: number) => void;
}

/* ---------------------------------------------------------- */
/*  Component                                                 */
/* ---------------------------------------------------------- */

export default function CodeTimeline({
  solve,
  onCodeChange,
  currentSnapshot,
  setCurrentSnapshot,
}: CodeTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize timeline data
  useEffect(() => {
    const initTimeline = async () => {
      setIsLoading(true);
      try {
        const timeline = await buildTimelineEvents(solve);
        setTimelineData(timeline);
        // Set current snapshot to the final one (last in timeline)
        setCurrentSnapshot(timeline.length || 1);
      } catch (error) {
        console.error('Failed to build timeline:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initTimeline();
  }, [solve, setCurrentSnapshot]);

  // Update code when timeline position changes
  useEffect(() => {
    if (timelineData.length > 0 && currentSnapshot > 0 && currentSnapshot <= timelineData.length) {
      const currentEvent = timelineData[currentSnapshot - 1];
      onCodeChange(currentEvent.code);
    }
  }, [currentSnapshot, timelineData, onCodeChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when timeline is loaded and not empty
      if (isLoading || timelineData.length === 0) {
        return;
      }

      // Prevent default behavior and handle navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentSnapshot(Math.max(1, currentSnapshot - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentSnapshot(Math.min(timelineData.length, currentSnapshot + 1));
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, timelineData.length, currentSnapshot, setCurrentSnapshot]);

  if (isLoading) {
    return (
      <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading code timeline...</span>
        </div>
      </div>
    );
  }

  if (timelineData.length === 0) {
    return null;
  }

  // Calculate start time for elapsed time calculations
  const startTime = timelineData[0]?.timestamp || 0;

  return (
    <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Code Evolution</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {timelineData[currentSnapshot - 1]?.label} ({currentSnapshot} of {timelineData.length}
              )
            </span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>
              {formatSnapshotTime(timelineData[currentSnapshot - 1]?.timestamp || 0)} (
              {formatElapsedTime(startTime, timelineData[currentSnapshot - 1]?.timestamp || 0)})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSnapshot(Math.max(1, currentSnapshot - 1))}
            disabled={currentSnapshot === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSnapshot(Math.min(timelineData.length, currentSnapshot + 1))}
            disabled={currentSnapshot === timelineData.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="relative">
        <div className="flex items-center">
          <div className="flex-1 relative h-2 bg-secondary rounded-full mx-2">
            {/* Timeline track */}
            <div
              className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-200"
              style={{
                width: `${((currentSnapshot - 1) / (timelineData.length - 1)) * 100}%`,
              }}
            />

            {/* Timeline markers */}
            {timelineData.map((event, index) => {
              // Determine if this is a "big" event (checkpoint, run, or final)
              const isBigEvent = !!event.isCheckpoint;

              // Size classes for different event types
              const sizeClasses = isBigEvent ? 'w-4 h-4' : 'w-2 h-2';
              const borderClasses = isBigEvent ? 'border-2' : 'border';

              // Color classes based on event type
              let borderColorClasses = '';
              if (index + 1 === currentSnapshot) {
                // Active state always uses primary color
                borderColorClasses = 'border-primary';
              } else if (event.type === 'final') {
                borderColorClasses = 'border-green-500 hover:border-green-400';
              } else if (event.type === 'run') {
                borderColorClasses = 'border-blue-500 hover:border-blue-400';
              } else if (event.type === 'snapshot' && event.isCheckpoint) {
                borderColorClasses = 'border-yellow-500 hover:border-yellow-400';
              } else {
                borderColorClasses = 'border-muted-foreground/30 hover:border-primary/50';
              }

              const elapsedTime = formatElapsedTime(startTime, event.timestamp);

              return (
                <button
                  key={event.id}
                  className={`absolute rounded-full transition-all duration-200 hover:scale-110 ${sizeClasses} ${borderClasses} ${borderColorClasses} ${
                    index + 1 === currentSnapshot ? 'bg-primary shadow-lg' : 'bg-background'
                  }`}
                  style={{
                    left: `${(index / (timelineData.length - 1)) * 100}%`,
                    top: '50%',
                    transform: 'translateX(-50%) translateY(-50%)',
                  }}
                  onClick={() => setCurrentSnapshot(index + 1)}
                  title={`${event.label} - ${formatSnapshotTime(event.timestamp)} (${elapsedTime})`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Timestamp labels */}
      <div className="flex justify-between mt-2 px-2">
        <span className="text-xs text-muted-foreground">
          {formatSnapshotTime(timelineData[0]?.timestamp || 0)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatSnapshotTime(timelineData[timelineData.length - 1]?.timestamp || 0)}
        </span>
      </div>
    </div>
  );
}
