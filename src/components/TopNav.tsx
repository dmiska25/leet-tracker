import { ModeBadge } from './ModeBadge';
import { ThemeToggle } from './ThemeToggle';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface TopNavProps {
  active: 'dashboard' | 'history';
  onSignOut: () => void;
}

export function TopNav({ active, onSignOut }: TopNavProps) {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-6xl mx-auto flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">LeetTracker</h1>
          <ModeBadge />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Tabs defaultValue={active} className="mr-4 hidden sm:block">
            <TabsList>
              <TabsTrigger value="dashboard" disabled>
                Dashboard
              </TabsTrigger>
              <div id="solveHistoryTooltip">
                <TabsTrigger value="history" disabled>
                  Solve History
                </TabsTrigger>
              </div>
              <Tooltip
                anchorId="solveHistoryTooltip"
                content="Work in progress"
                place="top"
                className="rounded-md bg-black text-white px-2 py-1 text-sm shadow-md"
              />
            </TabsList>
          </Tabs>
          <ThemeToggle />
          <Button variant="ghost" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
