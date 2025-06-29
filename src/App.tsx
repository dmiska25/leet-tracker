import { useState } from 'react';
import { useInitApp } from '@/hooks/useInitApp';
import Dashboard from '@/components/Dashboard';
import SolveHistory from '@/components/SolveHistory';
import SignIn from '@/components/SignIn';

function App() {
  const { loading, username } = useInitApp();
  const [screen, setScreen] = useState<'dashboard' | 'history'>('dashboard');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!username) return <SignIn />;

  return screen === 'dashboard' ? (
    <Dashboard onNavigate={setScreen} />
  ) : (
    <SolveHistory onNavigate={setScreen} />
  );
}

export default App;
