import { Clock, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Solve } from '@/types/types';
import clsx from 'clsx';

interface Props {
  solves: Solve[];
  selectedId: string | null;
  onSelect: (_: Solve) => void;
  onHide: () => void;
}

/** Helper: derive unique stable ID for a solve */
const solveId = (s: Solve) => `${s.slug}|${s.timestamp}`;

/** Determine if a solve has feedback filled out */
const needsFeedback = (s: Solve) =>
  !s.feedback ||
  s.feedback.summary?.final_score === 0 ||
  s.feedback.summary?.final_score === undefined;

export default function SolveSidebar({ solves, selectedId, onSelect, onHide }: Props) {
  return (
    <div className="w-full sm:w-80 h-full flex-shrink-0">
      <Card className="h-full">
        <CardHeader className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Solve History</CardTitle>
            <Button variant="ghost" size="sm" onClick={onHide} className="p-1">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2 p-4 pt-0">
              {solves.map((s) => {
                const id = solveId(s);
                const localDateTime = new Date(s.timestamp * 1000).toLocaleString(); // Format date and time
                return (
                  <div
                    key={id}
                    onClick={() => onSelect(s)}
                    className={clsx(
                      'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
                      selectedId === id && 'bg-accent border-primary',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{s.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {s.feedback?.summary?.final_score !== undefined &&
                          s.feedback.summary.final_score > 0 ? (
                            <Badge
                              variant="outline"
                              className={`text-[11px] px-1.5 py-0.5 ${
                                s.feedback.summary.final_score >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.feedback.summary.final_score >= 50
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Score: {s.feedback.summary.final_score}
                            </Badge>
                          ) : (
                            needsFeedback(s) && (
                              <Badge variant="outline" className="bg-orange-500/10 text-yellow-600">
                                Needs Feedback!
                              </Badge>
                            )
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {localDateTime}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
