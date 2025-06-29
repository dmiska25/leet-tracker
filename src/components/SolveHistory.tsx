import { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import { TopNav } from './TopNav';
import { useToast } from './ui/toast';
import type { Solve } from '@/types/types';
import { db } from '@/storage/db';

// Temporary mock data
const mockSolves: Solve[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    timestamp: Math.floor(Date.now() / 1000) - 86400,
    status: 'Accepted',
    lang: 'ts',
    problemDescription:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    code: 'function twoSum() {}',
    difficulty: undefined,
    tags: ['Array'],
    solveDetails: {
      solveTime: '15 minutes',
      usedHints: 'none',
      userNotes: 'Classic problem.',
    },
  },
];

export default function SolveHistory({
  onNavigate,
}: {
  onNavigate?: (_screen: 'dashboard' | 'history') => void;
}) {
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(mockSolves[0]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedCode, setExpandedCode] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [editingSolveDetails, setEditingSolveDetails] = useState(false);
  const [solveDetailsForm, setSolveDetailsForm] = useState(
    selectedSolve?.solveDetails || { solveTime: '', usedHints: 'none', userNotes: '' },
  );
  const toast = useToast();

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out? Your local progress will be cleared.'))
      return;
    await db.setActiveGoalProfile('default');
    await db.clearGoalProfiles();
    await db.setUsername('');
    await db.clearSolves();
    await db.setExtensionLastTimestamp(0);
    window.location.reload();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav active="history" onNavigate={onNavigate} onSignOut={handleSignOut} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6" style={{ height: 'calc(100vh - 8rem)' }}>
          {/* Sidebar */}
          <div
            className={`transition-all duration-300 ${showSidebar ? 'w-64' : 'w-0'} overflow-hidden`}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Solve History</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSidebar(false)}
                    className="p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-4 pt-0">
                    {mockSolves.map((solve) => (
                      <div
                        key={solve.timestamp}
                        onClick={() => {
                          setSelectedSolve(solve);
                          setSolveDetailsForm(
                            solve.solveDetails || {
                              solveTime: '',
                              usedHints: 'none',
                              userNotes: '',
                            },
                          );
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted ${
                          selectedSolve?.timestamp === solve.timestamp ? 'bg-muted' : ''
                        }`}
                      >
                        <h4 className="font-medium text-sm truncate">{solve.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(solve.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {!showSidebar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="fixed left-4 top-32 z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {selectedSolve ? (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedSolve.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        {formatTimestamp(selectedSolve.timestamp)}
                      </div>
                    </div>
                    {!showSidebar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSidebar(true)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" /> Show List
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full">
                    <div className="space-y-6">
                      {/* Problem Description */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Problem Description</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedDescription((v) => !v)}
                            className="gap-2"
                          >
                            {expandedDescription ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            {expandedDescription ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {expandedDescription
                            ? selectedSolve.problemDescription
                            : (selectedSolve.problemDescription || '').slice(0, 200)}
                        </p>
                      </div>

                      <Separator />

                      {/* Submission Code */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Submission Code</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedCode((v) => !v)}
                            className="gap-2"
                          >
                            {expandedCode ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            {expandedCode ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <pre className="text-sm overflow-x-auto">
                            <code>
                              {expandedCode
                                ? selectedSolve.code
                                : (selectedSolve.code || '').split('\n').slice(0, 20).join('\n')}
                            </code>
                          </pre>
                        </div>
                      </div>

                      <Separator />

                      {/* Solve Details */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Solve Details</h3>
                          {!editingSolveDetails ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSolveDetails(true)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSolveDetails(false)}
                                className="gap-2"
                              >
                                <X className="h-4 w-4" /> Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingSolveDetails(false);
                                  toast('Saved');
                                }}
                                className="gap-2"
                              >
                                <Save className="h-4 w-4" /> Save
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingSolveDetails ? (
                          <div className="grid gap-4">
                            <div>
                              <label className="text-sm font-medium block mb-1">Solve Time</label>
                              <Input
                                value={solveDetailsForm.solveTime}
                                onChange={(e) =>
                                  setSolveDetailsForm((p) => ({ ...p, solveTime: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium block mb-1">Used Hints</label>
                              <Select
                                value={solveDetailsForm.usedHints}
                                onChange={(e) =>
                                  setSolveDetailsForm((p) => ({
                                    ...p,
                                    usedHints: e.target.value as any,
                                  }))
                                }
                              >
                                <option value="none">None</option>
                                <option value="leetcode_hint">LeetCode Hint</option>
                                <option value="solution_peek">Solution Peek</option>
                                <option value="gpt_help">GPT Help</option>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium block mb-1">Notes</label>
                              <Textarea
                                rows={3}
                                value={solveDetailsForm.userNotes}
                                onChange={(e) =>
                                  setSolveDetailsForm((p) => ({ ...p, userNotes: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-3 text-sm text-muted-foreground">
                            <div>Time: {solveDetailsForm.solveTime || 'Not specified'}</div>
                            <div>Hints: {solveDetailsForm.usedHints}</div>
                            {solveDetailsForm.userNotes && (
                              <p className="mt-1">{solveDetailsForm.userNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <p className="text-center text-muted-foreground">Select a solve from the list.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
