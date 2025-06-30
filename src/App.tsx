import { useState } from 'react';
import { useInitApp } from '@/hooks/useInitApp';
import Dashboard from '@/components/Dashboard';
import SignIn from '@/components/SignIn';
import SolveHistory from '@/components/solveHistory/SolveHistory';
import HeaderNav from '@/components/HeaderNav';

function App() {
  const { loading, username } = useInitApp();
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!username) {
    return <SignIn />;
  }

  return (
    <>
      <HeaderNav view={view} onChange={setView} />
      {view === 'dashboard' ? <Dashboard /> : <SolveHistory />}
    </>
  );
}

export default App;
