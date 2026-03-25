import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import PurchasesPage from './pages/PurchasesPage';
import NewPurchasePage from './pages/NewPurchasePage';

function App() {
  return (
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
          success: {
            iconTheme: { primary: '#6bcb77', secondary: '#22222e' },
          },
          error: {
            iconTheme: { primary: '#e74c6f', secondary: '#22222e' },
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/purchases/new" element={<NewPurchasePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
