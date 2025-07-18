import { useState, useEffect } from 'react';
import { Calendar, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { db } from '@/storage/db';
import type { Solve } from '@/types/types';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { HintType } from '@/types/types';

/* ---------------------------------------------------------- */
/*  Helpers                                                   */
/* ---------------------------------------------------------- */

const truncateLines = (txt: string, maxLines = 5) => {
  const lines = txt.split('\n');
  if (lines.length <= maxLines) return txt;
  return lines.slice(0, maxLines).join('\n');
};

const formatTimeUsed = (sec?: number) => {
  if (!sec || sec <= 0) return 'Not specified';
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} min` : `${(min / 60).toFixed(1)} h`;
};

const hintOptions = [
  { value: 'none', label: 'None' },
  { value: 'leetcode_hint', label: 'LeetCode Hint' },
  { value: 'solution_peek', label: 'Solution Peek' },
  { value: 'gpt_help', label: 'GPT Help' },
] as const;

const hintLabel = (v: string | undefined) =>
  hintOptions.find((h) => h.value === v)?.label ?? 'None';

/* ---------------------------------------------------------- */
/*  Component                                                 */
/* ---------------------------------------------------------- */

interface Props {
  solve: Solve;
  onSaved: () => void;
  onShowList: () => void;
  showListButton: boolean;
}

export default function SolveDetail({ solve, onSaved, onShowList, showListButton }: Props) {
  /* ---------- relative timestamp ---------- */
  const timeText = useTimeAgo(new Date(solve.timestamp * 1000));
  const toast = useToast();

  /* ---------- cancel helpers ---------- */
  const cancelCodeEdit = () => {
    setCode(solve.code ?? '');
    setCodeEdit(false);
  };

  const cancelDetailsEdit = () => {
    setTimeMinutes(solve.timeUsed ? Math.round(solve.timeUsed / 60).toString() : '');
    setUsedHints((solve.usedHints as HintType) ?? 'none');
    setNotes(solve.notes ?? '');
    setDetailsEdit(false);
  };

  const cancelFeedbackEdit = () => {
    setFeedback(solve.feedback ?? feedback);
    setFbEdit(false);
  };

  /* ---------- code edit state ---------- */
  const [codeEdit, setCodeEdit] = useState(false);
  const [code, setCode] = useState(solve.code ?? '');
  const [showFullCode, setShowFullCode] = useState(false);

  /* ---------- solve-details edit state ---------- */
  const [detailsEdit, setDetailsEdit] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(
    solve.timeUsed ? Math.round(solve.timeUsed / 60).toString() : '',
  );
  const [usedHints, setUsedHints] = useState<HintType>((solve.usedHints as HintType) ?? 'none');
  const [notes, setNotes] = useState<string>(solve.notes ?? '');

  /* ---------- feedback edit state ---------- */
  const [fbEdit, setFbEdit] = useState(false);
  const [feedback, setFeedback] = useState<Solve['feedback']>(
    solve.feedback ?? {
      performance: {
        time_to_solve: 0,
        time_complexity: '',
        space_complexity: '',
        comments: '',
      },
      code_quality: {
        readability: 0,
        correctness: 0,
        maintainability: 0,
        comments: '',
      },
      summary: {
        final_score: 0,
        comments: '',
      },
    },
  );

  /* ---------- sync when solve prop changes ---------- */
  useEffect(() => {
    setCode(solve.code ?? '');
    setTimeMinutes(solve.timeUsed ? Math.round(solve.timeUsed / 60).toString() : '');
    setUsedHints((solve.usedHints as HintType) ?? 'none');
    setNotes(solve.notes ?? '');
    setFeedback(
      solve.feedback ?? {
        performance: {
          time_to_solve: 0,
          time_complexity: '',
          space_complexity: '',
          comments: '',
        },
        code_quality: {
          readability: 0,
          correctness: 0,
          maintainability: 0,
          comments: '',
        },
        summary: {
          final_score: 0,
          comments: '',
        },
      },
    );
    setCodeEdit(false);
    setDetailsEdit(false);
    setFbEdit(false);
    setShowFullCode(false);
  }, [solve]);

  /* ---------- persist helpers ---------- */
  const saveCode = async () => {
    if (!code.trim()) {
      toast('Code cannot be empty.', 'error');
      return;
    }
    try {
      await db.saveSolve({ ...solve, code });
      onSaved();
    } catch (err) {
      cancelCodeEdit();
      console.error(err);
      toast('Failed to save code. Please try again.', 'error');
    }
  };

  const saveDetails = async () => {
    /* ----- validation ----- */
    if (timeMinutes.trim()) {
      const mins = Number.parseInt(timeMinutes, 10);
      if (Number.isNaN(mins) || mins < 0) {
        toast('Solve time must be a non-negative number.', 'error');
        return;
      }
    }
    try {
      await db.saveSolve({
        ...solve,
        timeUsed: timeMinutes.trim() ? Number.parseInt(timeMinutes, 10) * 60 : undefined,
        usedHints,
        notes: notes.trim() ? notes : undefined,
      });
      onSaved();
    } catch (err) {
      cancelDetailsEdit();
      console.error(err);
      toast('Failed to save details. Please try again.', 'error');
    }
  };

  const saveFeedback = async () => {
    /* ----- basic validation ----- */
    const fb = feedback!;
    const ratings = [
      fb.performance.time_to_solve,
      fb.code_quality.readability,
      fb.code_quality.correctness,
      fb.code_quality.maintainability,
    ];
    const ratingsValid = ratings.every((r) => r >= 0 && r <= 5);
    const finalValid = fb.summary.final_score >= 0 && fb.summary.final_score <= 100;
    if (!ratingsValid || !finalValid) {
      toast('Numeric ratings are out of range.', 'error');
      return;
    }
    try {
      await db.saveSolve({ ...solve, feedback });
      onSaved();
    } catch (err) {
      cancelFeedbackEdit();
      console.error(err);
      toast('Failed to save feedback. Please try again.', 'error');
    }
  };

  /* -------------------------------------------------- */
  /*  Render helpers                                    */
  /* -------------------------------------------------- */

  const renderSolveDetails = () => {
    if (!detailsEdit) {
      return (
        <div className="grid gap-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Solve Time:</span>
            <span className="text-sm text-muted-foreground">{formatTimeUsed(solve.timeUsed)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Used Hints:</span>
            <span className="text-sm text-muted-foreground">{hintLabel(solve.usedHints)}</span>
          </div>
          <div>
            <span className="text-sm font-medium">Notes:</span>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {solve.notes ? solve.notes : '—'}
            </p>
          </div>
        </div>
      );
    }

    /* edit form */
    return (
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="time-minutes">
            Time Spent (min)
          </label>
          <input
            id="time-minutes"
            type="number"
            min={0}
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="used-hints">
            Used Hints
          </label>
          <select
            id="used-hints"
            value={usedHints}
            onChange={(e) => setUsedHints(e.target.value as HintType)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            {hintOptions.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1" htmlFor="user-notes">
            Notes
          </label>
          <Textarea
            id="user-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!fbEdit) {
      if (!solve.feedback || solve.feedback.summary?.final_score === undefined) {
        return (
          <div className="text-center text-muted-foreground py-8">
            <p>No feedback available.</p>
          </div>
        );
      }

      const fb = solve.feedback;
      return (
        <div className="grid gap-4">
          <div>
            <h4 className="font-medium mb-2">Performance</h4>
            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
              <div>Time to Solve: {fb.performance.time_to_solve}/5</div>
              <div>Time: {fb.performance.time_complexity}</div>
              <div>Space: {fb.performance.space_complexity}</div>
            </div>
            {fb.performance.comments && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {fb.performance.comments}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Code Quality</h4>
            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
              <div>Readability: {fb.code_quality.readability}/5</div>
              <div>Correctness: {fb.code_quality.correctness}/5</div>
              <div>Maintainability: {fb.code_quality.maintainability}/5</div>
            </div>
            {fb.code_quality.comments && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {fb.code_quality.comments}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm mb-2">Final Score: {fb.summary.final_score}/100</div>
            {fb.summary.comments && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {fb.summary.comments}
              </p>
            )}
          </div>
        </div>
      );
    }

    /* edit form */
    const upd = <T extends keyof NonNullable<Solve['feedback']>>(
      section: T,
      field: keyof NonNullable<Solve['feedback']>[T],
      value: any,
    ) => {
      setFeedback((p) => ({
        ...(p ?? {
          performance: {
            time_to_solve: 0,
            time_complexity: '',
            space_complexity: '',
            comments: '',
          },
          code_quality: {
            readability: 0,
            correctness: 0,
            maintainability: 0,
            comments: '',
          },
          summary: {
            final_score: 0,
            comments: '',
          },
        }),
        [section]: { ...p?.[section], [field]: value },
      }));
    };

    return (
      <div className="grid gap-6">
        {/* Performance */}
        <div>
          <h4 className="font-medium mb-3">Performance</h4>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="time-to-solve">
                  Time to Solve (0-5)
                </label>
                <input
                  id="time-to-solve"
                  type="number"
                  min={0}
                  max={5}
                  value={feedback?.performance?.time_to_solve ?? ''}
                  onChange={(e) =>
                    upd(
                      'performance' as keyof Solve['feedback'],
                      'time_to_solve',
                      Number.parseInt(e.target.value, 10),
                    )
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="time-complexity">
                  Time Complexity
                </label>
                <input
                  id="time-complexity"
                  type="text"
                  value={feedback?.performance?.time_complexity ?? ''}
                  onChange={(e) =>
                    upd('performance' as keyof Solve['feedback'], 'time_complexity', e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="space-complexity">
                  Space Complexity
                </label>
                <input
                  id="space-complexity"
                  type="text"
                  value={feedback?.performance?.space_complexity ?? ''}
                  onChange={(e) =>
                    upd(
                      'performance' as keyof Solve['feedback'],
                      'space_complexity',
                      e.target.value,
                    )
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="performance-comments">
                Performance Comments
              </label>
              <textarea
                id="performance-comments"
                value={feedback?.performance?.comments ?? ''}
                onChange={(e) =>
                  upd('performance' as keyof Solve['feedback'], 'comments', e.target.value)
                }
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
        </div>

        {/* Code Quality */}
        <div>
          <h4 className="font-medium mb-3">Code Quality</h4>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['readability', 'correctness', 'maintainability'] as const).map((f) => (
                <div key={f}>
                  <label className="text-sm font-medium block mb-1" htmlFor={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} (0-5)
                  </label>
                  <input
                    id={f}
                    type="number"
                    min={0}
                    max={5}
                    value={feedback?.code_quality[f]}
                    onChange={(e) => upd('code_quality', f, Number.parseInt(e.target.value, 10))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="code-quality-comments">
                Code Quality Comments
              </label>
              <textarea
                id="code-quality-comments"
                value={feedback?.code_quality?.comments ?? ''}
                onChange={(e) =>
                  upd('code_quality' as keyof Solve['feedback'], 'comments', e.target.value)
                }
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h4 className="font-medium mb-3">Summary</h4>
          <div className="grid gap-4">
            <div className="max-w-xs">
              <label className="text-sm font-medium block mb-1" htmlFor="final-score">
                Final Score (0-100)
              </label>
              <input
                id="final-score"
                type="number"
                min={0}
                max={100}
                value={feedback?.summary?.final_score ?? ''}
                onChange={(e) =>
                  upd(
                    'summary' as keyof Solve['feedback'],
                    'final_score',
                    Number.parseInt(e.target.value, 10),
                  )
                }
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="summary-comments">
                Summary Comments
              </label>
              <textarea
                id="summary-comments"
                value={feedback?.summary?.comments ?? ''}
                onChange={(e) =>
                  upd('summary' as keyof Solve['feedback'], 'comments', e.target.value)
                }
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* -------------------------------------------------- */
  /*  Render component                                  */
  /* -------------------------------------------------- */

  return (
    <Card className="h-full">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{solve.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{timeText}</span>
            </div>
          </div>
          {showListButton && (
            <Button variant="outline" size="sm" onClick={onShowList} className="gap-2">
              <Eye className="h-4 w-4" />
              Show List
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-6">
            {/* -------- Code -------- */}
            <section>
              <header className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Submission Code</h3>
                {codeEdit ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelCodeEdit}
                      className="gap-2 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveCode} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCodeEdit(true)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    {code && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullCode((v) => !v)}
                        className="gap-2"
                      >
                        {showFullCode ? (
                          <>
                            <EyeOff className="h-4 w-4" /> Collapse
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" /> Expand
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </header>

              {codeEdit ? (
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              ) : (
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto whitespace-pre">
                    <code>{showFullCode ? code : truncateLines(code, 5)}</code>
                  </pre>
                  {!showFullCode && code.split('\n').length > 5 && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      … {code.split('\n').length - 5} more lines
                    </p>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* -------- Solve Details -------- */}
            <section>
              <header className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Solve Details</h3>
                {detailsEdit ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelDetailsEdit}
                      className="gap-2 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveDetails} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailsEdit(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {solve.timeUsed || solve.usedHints || solve.notes ? 'Edit' : 'Add'} Details
                  </Button>
                )}
              </header>

              {renderSolveDetails()}
            </section>

            <Separator />

            {/* -------- Feedback -------- */}
            <section>
              <header className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Feedback</h3>
                {fbEdit ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelFeedbackEdit}
                      className="gap-2 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveFeedback} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFbEdit(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {solve.feedback ? 'Edit' : 'Add'} Feedback
                  </Button>
                )}
              </header>

              {renderFeedback()}
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
