import { Navigate } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';

export const AdminRoute = ({ children }) => {
    const { currentUser, userData, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <Navigate to="/admin/login" />;
    if (userData?.role !== 'admin') return <Navigate to="/" />; // Or unauthorized

    return children;
};

export const ProviderRoute = ({ children }) => {
    const { currentUser, userData, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <Navigate to="/provider/login" />;
    if (userData?.role !== 'provider') return <Navigate to="/" />;

    return children;
};

export const CustomerRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <Navigate to="/customer/login" />;

    return children;
};
