import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { LogOut } from 'lucide-react';

const CustomerLayout = () => {
    const { currentUser, setUserData, setCurrentUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        setUserData(null);
        setCurrentUser(null);
        navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Navbar */}
            <header className="h-16 border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <img src="/logo.png" alt="PrimeSewa Logo" className="h-8 w-auto group-hover:scale-105 transition-transform" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">PrimeSewa</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Home</Link>
                        <Link to="/dashboard" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">All Services</Link>

                        {currentUser ? (
                            <div className="flex items-center gap-6 ml-4 border-l border-gray-200 pl-6">
                                <Link to="/provider" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">Provider Portal</Link>
                                <Link to="/dashboard" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors">My Dashboard</Link>
                                <Link to="/profile" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">My Profile</Link>
                                <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2 text-sm font-bold border border-rose-200 text-rose-600 bg-rose-50 rounded-full hover:bg-rose-600 hover:text-white hover:shadow-lg hover:shadow-rose-600/20 transition-all">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 ml-4 border-l border-gray-200 pl-6">
                                <Link to="/provider" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Become a Partner</Link>
                                <Link to="/login" className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:-translate-y-0.5">
                                    Sign In
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 py-12">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} PrimeSewa. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 sm:mt-0">
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CustomerLayout;
