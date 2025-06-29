import { ModeBadge } from './ModeBadge';
import { ThemeToggle } from './ThemeToggle';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';

interface TopNavProps {
  active: 'dashboard' | 'history';
  onNavigate?: (_screen: 'dashboard' | 'history') => void;
  onSignOut: () => void;
}

export function TopNav({ active, onNavigate, onSignOut }: TopNavProps) {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-6xl mx-auto flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">LeetTracker</h1>
          <ModeBadge />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Tabs key={active} defaultValue={active} className="mr-4 hidden sm:block">
            <TabsList>
              <TabsTrigger value="dashboard" onClick={() => onNavigate?.('dashboard')}>
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="history" onClick={() => onNavigate?.('history')}>
                Solve History
              </TabsTrigger>
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
