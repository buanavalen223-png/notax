import { useState } from 'react';
import { AppShell, type ActiveRoute } from '../components/layout/AppShell';
import { OverviewFoundationPage } from '../features/overview/OverviewFoundationPage';

export function App() {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('overview');

  return (
    <AppShell activeRoute={activeRoute} onNavigate={setActiveRoute}>
      <OverviewFoundationPage
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
      />
    </AppShell>
  );
}

export default App;
