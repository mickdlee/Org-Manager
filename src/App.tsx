import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppStoreProvider } from './store/useAppStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveryUnitPage } from './pages/DeliveryUnitPage';
import { ReleaseTrainPage } from './pages/ReleaseTrainPage';
import { SquadPage } from './pages/SquadPage';
import { PeoplePage } from './pages/PeoplePage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/delivery-units/:id" element={<DeliveryUnitPage />} />
            <Route path="/release-trains/:duId/:rtId" element={<ReleaseTrainPage />} />
            <Route path="/squads/:duId/:rtId/:sqId" element={<SquadPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppStoreProvider>
    </AuthProvider>
  );
}
