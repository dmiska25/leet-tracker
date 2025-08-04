import { useState, useEffect } from 'react';
import { Calendar, Edit, Save, X, Eye, EyeOff, Copy, Upload, HelpCircle } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
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
import { StatusBadge } from './statusBadge';

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
/*  Validation                                                */
/* ---------------------------------------------------------- */

interface FeedbackValidationResult {
  isValid: boolean;
  errors: string[];
}

const validateFeedback = (feedback: NonNullable<Solve['feedback']>): FeedbackValidationResult => {
  const errors: string[] = [];

  // Validate numeric ranges - required for both manual and XML input
  const ratings = [
    { field: 'time_to_solve', value: feedback.performance.time_to_solve, min: 0, max: 5 },
    { field: 'readability', value: feedback.code_quality.readability, min: 0, max: 5 },
    { field: 'correctness', value: feedback.code_quality.correctness, min: 0, max: 5 },
    { field: 'maintainability', value: feedback.code_quality.maintainability, min: 0, max: 5 },
  ];

  for (const rating of ratings) {
    if (typeof rating.value !== 'number' || isNaN(rating.value)) {
      errors.push(`${rating.field} must be a valid number`);
    } else if (rating.value < rating.min || rating.value > rating.max) {
      errors.push(
        `${rating.field} must be between ${rating.min} and ${rating.max}, got ${rating.value}`,
      );
    }
  }

  // Validate final score - required for both manual and XML input
  if (typeof feedback.summary.final_score !== 'number' || isNaN(feedback.summary.final_score)) {
    errors.push('final_score must be a valid number');
  } else if (feedback.summary.final_score < 0 || feedback.summary.final_score > 100) {
    errors.push(`final_score must be between 0 and 100, got ${feedback.summary.final_score}`);
  }

  // Text fields are optional for both manual and XML input
  // They can be missing or empty - we just require the numeric values

  return {
    isValid: errors.length === 0,
    errors,
  };
};

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

  /* ---------- XML import helpers ---------- */
  const [xmlInputOpen, setXmlInputOpen] = useState(false);
  const [xmlText, setXmlText] = useState('');
  const [xmlError, setXmlError] = useState(false);

  /** Check if we have clipboard read access */
  const canReadClipboard = async (): Promise<boolean> => {
    try {
      // Check if the API exists and if we have permission
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return false;
      }
      // Try to read clipboard to test permissions
      await navigator.clipboard.readText();
      return true;
    } catch {
      return false;
    }
  };

  /** Smart import: auto-paste if possible, otherwise open manual input */
  const handleSmartImport = async () => {
    const hasClipboardAccess = await canReadClipboard();

    if (hasClipboardAccess) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText.trim()) {
          toast('Clipboard is empty', 'error');
          setXmlInputOpen(true);
          return;
        }
        setXmlText(clipboardText);
        const success = parseXmlFeedback(clipboardText);
        if (success) {
          setXmlInputOpen(false);
          setXmlText('');
        }
      } catch (_) {
        toast('Unable to read from clipboard', 'error');
        setXmlInputOpen(true);
      }
    } else {
      // No clipboard access, open manual input
      setXmlInputOpen(true);
    }
  };

  /** Build an LLM prompt containing all solve context + desired XML schema */
  const buildLLMPrompt = async () => {
    const status = solve.status ?? 'Unknown';
    const timeUsedText = formatTimeUsed(solve.timeUsed);
    const hints = hintLabel(solve.usedHints);
    const notesVal = solve.notes ?? '';
    const codeSnippet = solve.code ?? '';

    // get problem description from problem db
    const problem = await db.getProblem(solve.slug).catch(() => null);
    const problemDescription = problem?.description ?? 'No problem description available';

    // Escape backticks in code to prevent breaking the template literal
    const escapedCode = codeSnippet.replace(/`/g, '\\`');
    return `You are an expert coding-interview reviewer for leetcode problems.\nPlease analyse the submission below and return ONLY the following XML (wrapped in one \`code\` block):\n\n<feedback>\n  <performance time_to_solve="" time_complexity="" space_complexity="">\n    <comments></comments>\n  </performance>\n  <code_quality readability="" correctness="" maintainability="">\n    <comments></comments>\n  </code_quality>\n  <summary final_score="">\n    <comments></comments>\n  </summary>\n</feedback>\n\nField Formats:\n- time_to_solve: integer 0-5 (how efficiently solved)\n- readability: integer 0-5 (code clarity and style)\n- correctness: integer 0-5 (solution accuracy)\n- maintainability: integer 0-5 (code organization and extensibility)\n- time_complexity: string (e.g., "O(n)", "O(log n)", "O(n²)")\n- space_complexity: string (e.g., "O(1)", "O(n)", "O(n log n)")\n- final_score: integer 0-100 (overall performance)\n\nProblem Title: ${solve.title}\nStatus: ${status}\nSolve Time: ${timeUsedText}\nUsed Hints: ${hints}\nNotes: ${notesVal}\n\nSubmission Code:\n\`\`\`\n${escapedCode}\n\`\`\`\n\nProblem Description:\n${problemDescription}\n\nRemember to ONLY return the XML in a single \`code\` block, with no additional text or explanation.`;
  };

  /** Copy prompt to clipboard and conditionally open XML input */
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(await buildLLMPrompt());
      const hasClipboardAccess = await canReadClipboard();

      if (hasClipboardAccess) {
        // If we can read clipboard, don't auto-open - user can use smart import
        toast('Prompt copied - use "Import Feedback" to paste XML response.', 'success');
      } else {
        // No clipboard read access, auto-open for manual paste
        setXmlInputOpen(true);
        toast('Prompt copied - paste the XML reply in the box below.', 'success');
      }
    } catch {
      toast('Failed to copy prompt', 'error');
    }
  };

  /** Parse XML from textarea and populate feedback state */
  const parseXmlFeedback = (xmlStr: string): boolean => {
    try {
      const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
      const perf = doc.querySelector('performance');
      const cq = doc.querySelector('code_quality');
      const sum = doc.querySelector('summary');
      if (!perf || !cq || !sum) {
        throw new Error(
          'Invalid XML: missing required sections (performance, code_quality, summary)',
        );
      }

      const getNumAttr = (el: Element, attr: string) => {
        const val = el.getAttribute(attr);
        if (!val) throw new Error(`Missing required attribute: ${attr}`);
        const parsed = Number.parseInt(val, 10);
        if (Number.isNaN(parsed)) throw new Error(`Invalid number for attribute: ${attr}`);
        return parsed;
      };

      const getTextContent = (el: Element, selector: string) => {
        const textEl = el.querySelector(selector);
        // Allow empty or missing text content - return empty string if not found
        return textEl?.textContent || '';
      };

      const getStrAttr = (el: Element, attr: string) => {
        // Allow empty string attributes - return empty if not found
        return el.getAttribute(attr) || '';
      };

      // Clean up text fields: trim and normalize whitespace
      const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');

      const newFb: NonNullable<Solve['feedback']> = {
        performance: {
          time_to_solve: getNumAttr(perf, 'time_to_solve'),
          time_complexity: cleanText(getStrAttr(perf, 'time_complexity')),
          space_complexity: cleanText(getStrAttr(perf, 'space_complexity')),
          comments: cleanText(getTextContent(perf, 'comments')),
        },
        code_quality: {
          readability: getNumAttr(cq, 'readability'),
          correctness: getNumAttr(cq, 'correctness'),
          maintainability: getNumAttr(cq, 'maintainability'),
          comments: cleanText(getTextContent(cq, 'comments')),
        },
        summary: {
          final_score: getNumAttr(sum, 'final_score'),
          comments: cleanText(getTextContent(sum, 'comments')),
        },
      };

      // Use consistent validation for both XML and manual input
      const validation = validateFeedback(newFb);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Store original feedback state for potential rollback
      const originalFeedback = feedback;
      setFeedback(newFb);
      setXmlError(false); // Clear any previous errors

      // If not in edit mode, persist the changes immediately
      if (!fbEdit) {
        db.saveSolve({ ...solve, feedback: newFb })
          .then(() => {
            onSaved();
            toast('Feedback imported and saved!', 'success');
          })
          .catch((err) => {
            console.error('[XML-import-save]', err);
            // Restore original feedback state on save failure
            setFeedback(originalFeedback);
            toast('Feedback imported but failed to save. Please try again.', 'error');
          });
      } else {
        toast('Feedback imported!', 'success');
      }

      return true; // Success
    } catch (err) {
      console.error('[XML-import]', err);
      const errorMsg = err instanceof Error ? err.message : 'Invalid XML format';
      toast(`Import failed: ${errorMsg}`, 'error');
      setXmlError(true);
      return false; // Failure
    }
  };

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
    /* ----- centralized validation ----- */
    const fb = feedback!;
    const validation = validateFeedback(fb);
    if (!validation.isValid) {
      // Provide backward-compatible error message for manual input
      const hasNumericError = validation.errors.some(
        (err) => err.includes('must be between') || err.includes('must be a valid number'),
      );
      const errorMessage = hasNumericError
        ? 'Numeric ratings are out of range.'
        : `Validation failed: ${validation.errors[0]}`;
      toast(errorMessage, 'error');
      return;
    }

    try {
      await db.saveSolve({ ...solve, feedback });
      toast('Feedback saved!', 'success');
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{timeText}</span>
              <StatusBadge status={solve.status} />
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
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 px-2"
                    data-tooltip-id="feedback-help"
                    data-tooltip-html="How to use AI feedback generation:<br/>1) Copy Prompt → paste into ChatGPT<br/>2) Copy XML response from ChatGPT<br/>3) Import Feedback → auto-pastes from clipboard or opens manual input"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                  <Tooltip
                    id="feedback-help"
                    place="bottom-start"
                    style={{
                      backgroundColor: '#1f2937',
                      color: '#f9fafb',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      maxWidth: '300px',
                      zIndex: 9999,
                    }}
                    events={['hover', 'click']}
                    delayShow={100}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="gap-2"
                    title="Copy a prompt to paste into ChatGPT for AI feedback generation"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Prompt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSmartImport}
                    className="gap-2"
                    title="Import XML feedback - auto-paste from clipboard or open manual input"
                  >
                    <Upload className="h-4 w-4" />
                    Import Feedback
                  </Button>
                  {fbEdit ? (
                    <>
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
                    </>
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
                </div>
              </header>

              {xmlInputOpen && (
                <div className="mb-4">
                  <Textarea
                    value={xmlText}
                    onChange={(e) => {
                      setXmlText(e.target.value);
                      setXmlError(false); // Clear error when user starts typing
                    }}
                    rows={6}
                    className={`font-mono text-xs ${xmlError ? 'border-red-500 border-2' : ''}`}
                    placeholder={`Paste LLM XML response here…

Expected format:
<feedback>
  <performance time_to_solve="3" time_complexity="O(n)" space_complexity="O(1)">
    <comments>Good performance analysis...</comments>
  </performance>
  <code_quality readability="4" correctness="5" maintainability="3">
    <comments>Code quality feedback...</comments>
  </code_quality>
  <summary final_score="85">
    <comments>Overall summary...</comments>
  </summary>
</feedback>`}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setXmlInputOpen(false);
                        setXmlText('');
                        setXmlError(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const success = parseXmlFeedback(xmlText);
                        if (success) {
                          setXmlInputOpen(false);
                          setXmlText('');
                        }
                      }}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              )}
              {renderFeedback()}
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
