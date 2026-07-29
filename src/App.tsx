import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { AthletesScreen } from './screens/AthletesScreen';
import { WodsScreen } from './screens/WodsScreen';
import { CompetitionsScreen } from './screens/CompetitionsScreen';
import { CompetitionDetailScreen } from './screens/CompetitionDetailScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  return (
    <HashRouter>
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="sticky top-0 z-20 border-b border-hairline bg-paper/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-700 uppercase tracking-tight text-ink">
              WOD<span className="text-crimson">·</span>Ranker
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 pt-4">
          <Routes>
            <Route path="/" element={<Navigate to="/athletes" replace />} />
            <Route path="/athletes" element={<AthletesScreen />} />
            <Route path="/wods" element={<WodsScreen />} />
            <Route path="/competitions" element={<CompetitionsScreen />} />
            <Route path="/competitions/:id" element={<CompetitionDetailScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/athletes" replace />} />
          </Routes>
        </main>

        <TabBar />
      </div>
    </HashRouter>
  );
}
