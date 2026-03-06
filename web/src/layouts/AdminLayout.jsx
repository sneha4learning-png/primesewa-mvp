import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, UserCog, CalendarDays, DollarSign, LogOut, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';

const AdminLayout = () => {
    const { setUserData } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const notifications = [
        { id: 1, text: 'New provider Rahul Sharma applied.', time: '10 mins ago', unread: true },
        { id: 2, text: 'Booking B1003 is pending assignment.', time: '1 hour ago', unread: true },
        { id: 3, text: 'Weekly commission report generated.', time: '2 days ago', unread: false }
    ];

    const handleLogout = () => {
        setUserData(null);
        navigate('/admin/login');
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
            ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 shadow-inner border border-blue-500/20'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;

    const SidebarInner = () => (
        <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
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
                    <li><NavLink to="/admin" end className={navLinkClass} onClick={() => setSidebarOpen(false)}><LayoutDashboard className="w-5 h-5" /> Dashboard</NavLink></li>
                    <li><NavLink to="/admin/providers" className={navLinkClass} onClick={() => setSidebarOpen(false)}><UserCog className="w-5 h-5" /> Provider Fleet</NavLink></li>
                    <li><NavLink to="/admin/bookings" className={navLinkClass} onClick={() => setSidebarOpen(false)}><CalendarDays className="w-5 h-5" /> Live Bookings</NavLink></li>
                    <li><NavLink to="/admin/commissions" className={navLinkClass} onClick={() => setSidebarOpen(false)}><DollarSign className="w-5 h-5" /> Commissions</NavLink></li>
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

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-[#0B0F19] border-r border-[#1E293B] flex-col relative overflow-hidden">
                <SidebarInner />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-[#0B0F19] flex flex-col overflow-hidden z-10">
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
                        <h1 className="text-base lg:text-xl font-bold text-slate-800 tracking-tight">Command Center</h1>
                    </div>
                    <div className="flex items-center gap-3 lg:gap-5">
                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-72 lg:w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="font-bold text-slate-800">Notifications</h3>
                                        <span className="text-xs font-semibold text-blue-600 cursor-pointer">Mark all read</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.map(n => (
                                            <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${n.unread ? 'bg-blue-50/30' : ''}`}>
                                                <p className={`text-sm ${n.unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.text}</p>
                                                <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 text-center border-t border-slate-100">
                                        <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">View All Notifications</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-sm font-bold text-slate-900">System Admin</span>
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 justify-end">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Root Access
                            </span>
                        </div>
                        <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold shadow-md">A</div>
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
