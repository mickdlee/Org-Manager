import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { AppStoreProvider } from './store/useAppStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveryUnitPage } from './pages/DeliveryUnitPage';
import { DeliveryUnitOnboardingPage } from './pages/DeliveryUnitOnboardingPage';
import { ReleaseTrainPage } from './pages/ReleaseTrainPage';
import { SquadPage } from './pages/SquadPage';
import { SquadEditorPage } from './pages/SquadEditorPage';
import { SquadOnboardingPage } from './pages/SquadOnboardingPage';
import { PeoplePage } from './pages/PeoplePage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './store/useAppStore';
import { canManageDeliveryUnit, canManageSquad } from './utils/permissions';

function RequireDUManager({ children }: { children: ReactElement }) {
  const { duId } = useParams<{ duId: string }>();
  const { data } = useAppStore();
  const { session } = useAuth();

  if (!duId || !canManageDeliveryUnit(data, session, duId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RequireSquadManager({ children }: { children: ReactElement }) {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data } = useAppStore();
  const { session } = useAuth();

  if (!duId || !rtId || !sqId || !canManageSquad(data, session, duId, rtId, sqId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/delivery-units/:id" element={<DeliveryUnitPage />} />
            <Route
              path="/delivery-units/:duId/onboarding"
              element={
                <RequireDUManager>
                  <DeliveryUnitOnboardingPage />
                </RequireDUManager>
              }
            />
            <Route path="/release-trains/:duId/:rtId" element={<ReleaseTrainPage />} />
            <Route path="/squads/:duId/:rtId/:sqId" element={<SquadPage />} />
            <Route
              path="/squads/:duId/:rtId/:sqId/editor"
              element={
                <RequireSquadManager>
                  <SquadEditorPage />
                </RequireSquadManager>
              }
            />
            <Route
              path="/squads/:duId/:rtId/:sqId/onboarding"
              element={
                <RequireSquadManager>
                  <SquadOnboardingPage />
                </RequireSquadManager>
              }
            />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppStoreProvider>
    </AuthProvider>
  );
}
