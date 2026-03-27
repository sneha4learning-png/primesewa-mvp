import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Briefcase, DollarSign, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import NotificationBell from '../components/NotificationBell';
const ProviderLayout = () => {
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [providerId, setProviderId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [providerStatus, setProviderStatus] = useState('pending');

    const handleLogout = async () => {
        await logout();
        navigate('/provider/login');
    };

    useEffect(() => {
        const fetchStatus = async () => {
            if (userData?.uid) {
                try {
                    const docSnap = await getDoc(doc(db, 'providers', userData.uid));
                    if (docSnap.exists()) {
                        const dat = docSnap.data();
                        setIsOnline(dat.isOnline || false);
                        setProviderStatus(dat.status || 'pending');
                        setProviderId(userData.uid);
                    }
                } catch (e) {
                    console.error("Error fetching online status:", e);
                }
            }
        };
        fetchStatus();
    }, [userData]);

    const toggleOnlineStatus = async () => {
        if (!providerId) return;
        const newStatus = !isOnline;
        setStatusUpdating(true);
        try {
            await updateDoc(doc(db, 'providers', providerId), {
                isOnline: newStatus
            });
            setIsOnline(newStatus);
            setTimeout(() => setStatusUpdating(false), 2000);
        } catch (e) {
            console.error("Error updating online status:", e);
            // Revert on failure
            setIsOnline(isOnline);
            setStatusUpdating(false);
        }
    };

    const providerName = userData?.name || 'Provider Dashboard';
    const providerInitial = userData?.name?.charAt(0) || 'P';

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
            ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 shadow-inner border border-indigo-500/20'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;

    const SidebarInner = () => (
        <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="h-24 flex items-center justify-between px-6 border-b border-white/5 relative z-10">
                    <Link to="/provider" className="flex items-center gap-4 group">
                        <img src="/primesewa_logo.png" alt="PrimeSewa" className="w-14 h-14 object-contain transition-transform" />
                        <span className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800 tracking-tighter">PrimeSewa</span>
                    </Link>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-8">
                {providerStatus === 'active' ? (
                    <ul className="space-y-2 px-4 relative z-10">
                        <li>
                            <NavLink to="/provider" end className={navLinkClass} onClick={() => setSidebarOpen(false)}>
                                <Briefcase className="w-5 h-5" /> 
                                <span>Service Requests</span>
                            </NavLink>
                        </li>
                        <li><NavLink to="/provider/earnings" className={navLinkClass} onClick={() => setSidebarOpen(false)}><DollarSign className="w-5 h-5" /> Earnings Center</NavLink></li>
                        <li><NavLink to="/provider/profile" className={navLinkClass} onClick={() => setSidebarOpen(false)}><UserCircle className="w-5 h-5" /> My Profile</NavLink></li>
                    </ul>
                ) : (
                    <div className="px-6 py-10 text-center">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserCircle className="w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">Navigation is locked until your account is approved.</p>
                    </div>
                )}
            </nav>
            <div className="p-4 border-t border-white/10 relative z-10 space-y-3">
                <Link to="/" className="flex items-center justify-center gap-3 px-4 py-3 w-full text-indigo-300 font-bold rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-inner transition-all duration-300">
                    🏠 Customer Portal
                </Link>
                <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 w-full text-slate-300 font-medium rounded-xl hover:bg-rose-500/20 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all duration-300">
                    <LogOut className="w-5 h-5" /> Secure Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-[#0F172A] border-r border-[#1E293B] flex-col relative overflow-hidden">
                <SidebarInner />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-[#0F172A] flex flex-col overflow-hidden z-10">
                        <SidebarInner />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm lg:text-xl font-black text-slate-800 tracking-tight truncate max-w-[140px] lg:max-w-none">{providerName}</h1>
                        {statusUpdating && (
                            <span className="hidden md:inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full animate-pulse border border-emerald-100 uppercase tracking-widest">
                                Status Synced
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 lg:gap-5">
                        <NotificationBell />
                        {providerStatus === 'active' && (
                            <button
                                onClick={toggleOnlineStatus}
                                className={`relative inline-flex h-7 w-14 lg:h-8 lg:w-16 items-center rounded-full transition-colors focus:outline-none ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className="sr-only">Toggle Online Status</span>
                                <span className={`inline-block h-5 w-5 lg:h-6 lg:w-6 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-8 lg:translate-x-9' : 'translate-x-1'}`} />
                            </button>
                        )}
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-sm font-bold text-slate-900">Partner Status</span>
                            <span className={`text-xs font-bold flex items-center gap-1.5 justify-end ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                                <span className="relative flex h-2 w-2">
                                    {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                </span>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
                            {providerInitial}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative">
                    {providerStatus === 'pending' ? (
                        <div className="max-w-3xl mx-auto bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl shadow-sm flex items-start gap-4 mt-8">
                            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                            <div>
                                <h3 className="text-xl text-amber-800 font-bold mb-2">Account Pending Approval</h3>
                                <p className="text-amber-700 font-medium">
                                    Your application is currently being reviewed by our team. You will not receive any service requests until your account is approved.
                                </p>
                            </div>
                        </div>
                    ) : providerStatus === 'suspended' ? (
                        <div className="max-w-3xl mx-auto bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl shadow-sm flex items-start gap-4 mt-8">
                            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                            <div>
                                <h3 className="text-xl text-red-800 font-bold mb-2">Account Suspended</h3>
                                <p className="text-red-700 font-medium">
                                    Your account has been suspended by the administrator. Please contact support for more information.
                                </p>
                            </div>
                        </div>
                    ) : providerStatus === 'rejected' ? (
                        <div className="max-w-3xl mx-auto bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl shadow-sm flex items-start gap-4 mt-8">
                            <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
                            <div>
                                <h3 className="text-xl text-rose-800 font-bold mb-2">Account Rejected</h3>
                                <p className="text-rose-700 font-medium">
                                    Your application was rejected. Please contact support if you believe this is an error.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProviderLayout;
