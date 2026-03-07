import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Briefcase, DollarSign, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
const ProviderLayout = () => {
    const { userData, setUserData, setCurrentUser } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [providerId, setProviderId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        setUserData(null);
        setCurrentUser(null);
        navigate('/provider/login');
    };

    useEffect(() => {
        const fetchStatus = async () => {
            if (userData?.uid) {
                try {
                    const docSnap = await getDoc(doc(db, 'providers', userData.uid));
                    if (docSnap.exists()) {
                        setIsOnline(docSnap.data().isOnline || false);
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
        setIsOnline(newStatus);
        try {
            await updateDoc(doc(db, 'providers', providerId), {
                isOnline: newStatus
            });
        } catch (e) {
            console.error("Error updating online status:", e);
            // Revert on failure
            setIsOnline(!newStatus);
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
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 relative z-10">
                <span className="flex items-center gap-2">
                    <img src="/logo.png" alt="PrimeSewa Logo" className="h-8 w-auto" />
                    <span className="text-xl font-bold text-white tracking-tight">PrimeSewa</span>
                </span>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-8">
                <ul className="space-y-2 px-4 relative z-10">
                    <li><NavLink to="/provider" end className={navLinkClass} onClick={() => setSidebarOpen(false)}><Briefcase className="w-5 h-5" /> Service Requests</NavLink></li>
                    <li><NavLink to="/provider/earnings" className={navLinkClass} onClick={() => setSidebarOpen(false)}><DollarSign className="w-5 h-5" /> Earnings Center</NavLink></li>
                    <li><NavLink to="/provider/profile" className={navLinkClass} onClick={() => setSidebarOpen(false)}><UserCircle className="w-5 h-5" /> My Profile</NavLink></li>
                </ul>
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
                    </div>
                    <div className="flex items-center gap-3 lg:gap-5">
                        <button
                            onClick={toggleOnlineStatus}
                            className={`relative inline-flex h-7 w-14 lg:h-8 lg:w-16 items-center rounded-full transition-colors focus:outline-none ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className="sr-only">Toggle Online Status</span>
                            <span className={`inline-block h-5 w-5 lg:h-6 lg:w-6 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-8 lg:translate-x-9' : 'translate-x-1'}`} />
                        </button>
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
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ProviderLayout;
