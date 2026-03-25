import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import PurchasesPage from './pages/PurchasesPage';
import NewPurchasePage from './pages/NewPurchasePage';
import LoginPage from './pages/LoginPage';
import TeamSettingsPage from './pages/TeamSettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { TeamProvider } from './contexts/TeamContext';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Inside ProtectedRoute we know the user is authenticated, so we wrap with TeamProvider
  return <TeamProvider>{children}</TeamProvider>;
};

// Route that redirects away from login if already authenticated
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#22222e',
              color: '#e8e6e3',
              border: '1px solid #2e2e3e',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#6bcb77', secondary: '#22222e' } },
            error: { iconTheme: { primary: '#e74c6f', secondary: '#22222e' } },
          }}
        />
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected App Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/purchases/new" element={<NewPurchasePage />} />
            <Route path="/team-settings" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
