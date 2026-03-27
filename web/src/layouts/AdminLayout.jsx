import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, UserCog, CalendarDays, DollarSign, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import NotificationBell from '../components/NotificationBell';

const navLinkClass = ({ isActive }) =>
    `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 shadow-inner border border-blue-500/20'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;

const SidebarInner = ({ setSidebarOpen, handleLogout }) => (
    <>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="h-24 flex items-center justify-between px-6 border-b border-white/5 relative z-10">
            <span className="flex items-center gap-4">
                <img src="/primesewa_logo.png" alt="PrimeSewa" className="w-14 h-14 object-contain" />
                <span className="text-2xl font-medium text-white tracking-tighter">PrimeSewa</span>
            </span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-8">
            <ul className="space-y-2 px-4 relative z-10">
                <li><NavLink to="/admin" end className={navLinkClass} onClick={() => setSidebarOpen(false)}><LayoutDashboard className="w-5 h-5" /> Dashboard</NavLink></li>
                <li><NavLink to="/admin/providers" className={navLinkClass} onClick={() => setSidebarOpen(false)}><UserCog className="w-5 h-5" /> Provider Fleet</NavLink></li>
                <li><NavLink to="/admin/bookings" className={navLinkClass} onClick={() => setSidebarOpen(false)}><CalendarDays className="w-5 h-5" /> Live Bookings</NavLink></li>
                <li><NavLink to="/admin/commissions" className={navLinkClass} onClick={() => setSidebarOpen(false)}><DollarSign className="w-5 h-5" /> Payouts & Commissions</NavLink></li>
                <li><NavLink to="/admin/users" className={navLinkClass} onClick={() => setSidebarOpen(false)}><Users className="w-5 h-5" /> Consumers</NavLink></li>
            </ul>
        </nav>
        <div className="p-4 border-t border-white/10 relative z-10">
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 w-full text-slate-300 font-medium rounded-xl hover:bg-rose-500/20 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all duration-300">
                <LogOut className="w-5 h-5" /> Terminate Session
            </button>
        </div>
    </>
);

const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-[#0B0F19] border-r border-[#1E293B] flex-col relative overflow-hidden">
                <SidebarInner setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-[#0B0F19] flex flex-col overflow-hidden z-10">
                        <SidebarInner setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base lg:text-xl font-medium text-slate-800 tracking-tight">Command Center</h1>
                    </div>
                    <div className="flex items-center gap-3 lg:gap-5">
                        <NotificationBell />
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-sm font-medium text-slate-900">System Admin</span>
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 justify-end">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Root Access
                            </span>
                        </div>
                        <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-medium shadow-md">A</div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
