import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionFormPage from './pages/TransactionFormPage';
import HistoryPage from './pages/HistoryPage';
import WalletPage from './pages/WalletPage';
import BottomNav from './components/BottomNav';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-950 text-white max-w-md mx-auto relative">
    <div className="pb-20">{children}</div>
    <BottomNav />
  </div>
);

const AppRoutes = () => {
  const { isLoggedIn } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/tambah" element={
        <ProtectedRoute>
          <AppLayout><TransactionFormPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/edit/:id" element={
        <ProtectedRoute>
          <AppLayout><TransactionFormPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/riwayat" element={
        <ProtectedRoute>
          <AppLayout><HistoryPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/dompet" element={
        <ProtectedRoute>
          <AppLayout><WalletPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
