import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
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
                <RequireAdmin>
                  <DeliveryUnitOnboardingPage />
                </RequireAdmin>
              }
            />
            <Route path="/release-trains/:duId/:rtId" element={<ReleaseTrainPage />} />
            <Route path="/squads/:duId/:rtId/:sqId" element={<SquadPage />} />
            <Route
              path="/squads/:duId/:rtId/:sqId/editor"
              element={
                <RequireAdmin>
                  <SquadEditorPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/squads/:duId/:rtId/:sqId/onboarding"
              element={
                <RequireAdmin>
                  <SquadOnboardingPage />
                </RequireAdmin>
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
