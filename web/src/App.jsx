import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './firebase/AuthContext';
import { AdminRoute, ProviderRoute, CustomerRoute } from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import ProviderLayout from './layouts/ProviderLayout';

// Admin Pages
import DashboardOverview from './pages/admin/DashboardOverview';
import ProviderManagement from './pages/admin/ProviderManagement';
import BookingMonitoring from './pages/admin/BookingMonitoring';
import CommissionDashboard from './pages/admin/CommissionDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminLogin from './pages/admin/AdminLogin';

// Customer Pages
import LandingPage from './pages/customer/LandingPage';
import LoginPage from './pages/customer/LoginPage';
import CustomerHome from './pages/customer/CustomerHome';
import CustomerProfile from './pages/customer/CustomerProfile';

// Provider Pages
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderLogin from './pages/provider/ProviderLogin';
import ProviderEarnings from './pages/provider/ProviderEarnings';
import ProviderProfile from './pages/provider/ProviderProfile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public / Customer Routes */}
          <Route path="/" element={<Navigate to="/customer" />} />
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="app" element={<CustomerRoute><CustomerHome /></CustomerRoute>} />
            <Route path="profile" element={<CustomerRoute><CustomerProfile /></CustomerRoute>} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin">
            <Route index element={<Navigate to="/admin/app" replace />} />
            <Route path="login" element={<AdminLogin />} />
            <Route path="app" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<DashboardOverview />} />
              <Route path="providers" element={<ProviderManagement />} />
              <Route path="bookings" element={<BookingMonitoring />} />
              <Route path="commissions" element={<CommissionDashboard />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
          </Route>

          {/* Provider Routes */}
          <Route path="/provider">
            <Route index element={<Navigate to="/provider/app" replace />} />
            <Route path="login" element={<ProviderLogin />} />
            <Route path="app" element={<ProviderRoute><ProviderLayout /></ProviderRoute>}>
              <Route index element={<ProviderDashboard />} />
              <Route path="earnings" element={<ProviderEarnings />} />
              <Route path="profile" element={<ProviderProfile />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/customer" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
