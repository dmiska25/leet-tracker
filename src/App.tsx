import { useInitApp } from '@/hooks/useInitApp';
import Dashboard from '@/components/Dashboard';
import SignIn from '@/components/SignIn';

function App() {
  const { loading, username } = useInitApp();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return username ? <Dashboard /> : <SignIn />;
}

export default App;
