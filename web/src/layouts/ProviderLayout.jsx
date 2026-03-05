import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Briefcase, DollarSign, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import { getProviders, updateProviderOnlineStatus } from '../utils/mockDb';

const ProviderLayout = () => {
    const { userData, setUserData, setCurrentUser } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [providerId, setProviderId] = useState(null);

    const handleLogout = () => {
        setUserData(null);
        setCurrentUser(null);
        navigate('/provider/login');
    };

    useEffect(() => {
        const providerName = userData?.name;
        if (providerName) {
            const providers = getProviders();
            const me = providers.find(p => p.name === providerName);
            if (me) {
                setIsOnline(me.isOnline || false);
                setProviderId(me.id);
            }
        }
    }, [userData]);

    const toggleOnlineStatus = () => {
        if (!providerId) return;
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        updateProviderOnlineStatus(providerId, newStatus);
    };

    const providerName = userData?.name || 'Provider Dashboard';
    const providerInitial = userData?.name?.charAt(0) || 'P';

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0F172A] border-r border-[#1E293B] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="h-20 flex items-center px-8 border-b border-white/10 relative z-10">
                    <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent transform hover:scale-105 transition-transform cursor-default">Partner Portal</span>
                </div>
                <nav className="flex-1 overflow-y-auto py-8">
                    <ul className="space-y-2 px-4 relative z-10">
                        <li>
                            <NavLink to="/provider" end className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 shadow-inner border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <Briefcase className="w-5 h-5" /> Service Requests
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/provider/earnings" className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 shadow-inner border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <DollarSign className="w-5 h-5" /> Earnings Center
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/provider/profile" className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 shadow-inner border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <UserCircle className="w-5 h-5" /> My Profile
                            </NavLink>
                        </li>
                    </ul>
                </nav>
                <div className="p-4 border-t border-white/10 relative z-10">
                    <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 w-full text-slate-300 font-medium rounded-xl hover:bg-rose-500/20 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all duration-300">
                        <LogOut className="w-5 h-5" /> Secure Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-10 z-10 sticky top-0 shadow-sm">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">{providerName}</h1>
                    <div className="flex items-center gap-5">
                        <button
                            onClick={toggleOnlineStatus}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className="sr-only">Toggle Online Status</span>
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-9' : 'translate-x-1'}`}
                            />
                        </button>
                        <div className="flex flex-col text-right">
                            <span className="text-sm font-bold text-slate-900">Partner Status</span>
                            <span className={`text-xs font-bold flex items-center gap-1.5 justify-end ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                                <span className="relative flex h-2 w-2">
                                    {isOnline && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                </span>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-50">
                            {providerInitial}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-10 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ProviderLayout;
