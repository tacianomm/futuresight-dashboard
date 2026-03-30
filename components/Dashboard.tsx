'use client';

import { useDashboard } from '@/store/dashboard';
import { useSupabase } from '@/hooks/useSupabase';
import Header from './Header';
import StatsBar from './StatsBar';
import FocusPanels from './FocusPanels';
import VentureNav from './VentureNav';
import TaskSection from './TaskSection';
import VenturePanel from './VenturePanel';
import ChartsSection from './ChartsSection';

export default function Dashboard() {
  // Bootstrap Supabase data on mount
  useSupabase();

  const activeVenture = useDashboard((s) => s.activeVenture);

  return (
    <div>
      <Header />
      <StatsBar />
      <FocusPanels />
      <VentureNav />
      {activeVenture ? (
        <VenturePanel venture={activeVenture} />
      ) : (
        <>
          <ChartsSection />
          <TaskSection />
        </>
      )}
    </div>
  );
}
