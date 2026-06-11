import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { User, LogOut, Menu, X, Bell, ShoppingBag, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '../components/NotificationBell';

const CustomerLayout = () => {
    const { currentUser, userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isProvider = userData?.role === 'provider';

    const handleLogout = async () => {
        setMobileMenuOpen(false);
        await logout();
        navigate('/');
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Navbar */}
            <header className="h-24 border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-4 group" onClick={closeMobileMenu}>
                        <img src="/primesewa_logo.png" alt="PrimeSewa" className="w-20 h-20 object-contain transition-transform group-hover:scale-110 duration-500 py-1" />
                        <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500 tracking-tighter drop-shadow-sm">PrimeSewa</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}>Home</Link>
                        <Link to="/dashboard#service-catalog" className={`text-sm font-medium transition-colors ${location.pathname === '/dashboard' && !currentUser ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}>All Services</Link>

                        {currentUser ? (
                            <div className="flex items-center gap-6 ml-4 border-l border-gray-200 pl-6">
                                <Link to={isProvider ? "/provider" : "/provider/login"} className="text-sm font-medium text-indigo-500 hover:text-indigo-600 transition-colors">Provider Portal</Link>
                                <Link to="/dashboard#top" className={`text-sm font-medium transition-colors ${location.hash !== '#service-catalog' && location.pathname === '/dashboard' ? 'text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100' : 'text-gray-600 hover:text-indigo-600'}`}>My Dashboard</Link>
                                <Link to="/profile" className={`text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100' : 'text-gray-600 hover:text-indigo-600'}`}>My Profile</Link>
                                <NotificationBell />
                                <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2 text-sm font-medium border border-rose-200 text-rose-600 bg-rose-50 rounded-full hover:bg-rose-600 hover:text-white hover:shadow-lg hover:shadow-rose-600/20 transition-all">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 ml-4 border-l border-gray-200 pl-6">
                                <Link to="/provider/login?signup=true" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">Become a Partner</Link>
                                <Link to="/login" className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:-translate-y-0.5">
                                    Sign In
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* Mobile Hamburger Button */}
                    <div className="flex items-center gap-2 md:hidden">
                        {currentUser && <NotificationBell />}
                        <button
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex flex-col pt-16" onClick={closeMobileMenu}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div
                        className="relative bg-white border-b border-indigo-100 shadow-xl px-4 py-6 flex flex-col gap-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <Link to="/" onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                            🏠 Home
                        </Link>
                        <Link to="/dashboard#service-catalog" onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/dashboard' && !currentUser ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                            🔧 All Services
                        </Link>

                        {currentUser ? (
                            <>
                                <div className="h-px bg-gray-100 my-1" />
                                <Link to={isProvider ? "/provider" : "/provider/login"} onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 transition-colors">
                                    🤝 Provider Portal
                                </Link>
                                <Link to="/dashboard#top" onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/dashboard' && location.hash !== '#service-catalog' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                    📋 My Dashboard
                                </Link>
                                <Link to="/profile" onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/profile' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                    👤 My Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 font-bold hover:bg-rose-50 transition-colors text-left w-full border border-rose-100 mt-2"
                                >
                                    <LogOut className="w-5 h-5" /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="h-px bg-gray-100 my-1" />
                                <Link to="/provider/login?signup=true" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                    🤝 Become a Partner
                                </Link>
                                <Link to="/login" onClick={closeMobileMenu} className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md mt-2">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}

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
