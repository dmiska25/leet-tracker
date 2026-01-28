import { useState, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Solve } from '@/types/types';
import { groupSolvesBySession } from '@/utils/solveGrouping';
import { StatusBadge } from './statusBadge';
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
const needsFeedback = (s: Solve) => s.feedback?.summary?.final_score === undefined;

export default function SolveSidebar({ solves, selectedId, onSelect, onHide }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedSolves = useMemo(() => {
    // Determine sessions using the 4h gap logic
    const sessions = groupSolvesBySession(solves);
    return sessions.map((session) => {
      // session[0] is guaranteed to be the latest thanks to groupSolvesBySession sort
      const head = session[0];
      const children = session.slice(1);
      const key = `${head.slug}|${head.timestamp}`;
      return { key, head, children };
    });
  }, [solves]);

  const toggleGroup = (key: string) => {
    const next = new Set(expandedGroups);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedGroups(next);
  };

  const renderSolveItem = (
    s: Solve,
    key: string,
    isChild = false,
    hasChildren = false,
    isExpanded = false,
  ) => {
    const id = solveId(s);
    const localDateTime = new Date(s.timestamp * 1000).toLocaleString();
    return (
      <div
        key={id}
        onClick={() => onSelect(s)}
        className={clsx(
          'rounded-lg border cursor-pointer transition-colors hover:bg-accent relative group/item',
          selectedId === id && 'bg-accent border-primary',
          isChild && 'ml-6 mt-1 border-l-4 border-l-muted-foreground/20',
        )}
      >
        <div className="flex items-stretch">
          <div className={`flex-1 min-w-0 py-3 ${!hasChildren || isChild ? 'px-3' : 'pl-3 pr-1'}`}>
            <h4 className="font-medium text-sm break-words leading-tight">{s.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={s.status} />
              {s.feedback?.summary?.final_score !== undefined ? (
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
                !isChild &&
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

          {hasChildren && !isChild && (
            <>
              <div
                className={clsx(
                  'w-px ml-2',
                  selectedId === id
                    ? 'bg-foreground/20'
                    : 'bg-border group-hover/item:bg-foreground/20',
                )}
              />
              <div className="flex items-center justify-center p-2 pl-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 !p-0 hover:bg-muted text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(key);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

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
              {groupedSolves.map(({ key, head, children }) => {
                const isExpanded = expandedGroups.has(key);
                const hasChildren = children.length > 0;

                return (
                  <div key={key} className="group">
                    {renderSolveItem(head, key, false, hasChildren, isExpanded)}
                    {isExpanded &&
                      children.map((child) => renderSolveItem(child, key, true, false, false))}
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
