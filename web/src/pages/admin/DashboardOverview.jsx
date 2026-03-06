import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, DollarSign, CalendarDays, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
        <div className={`p-4 rounded-lg ${colorClass}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const DashboardOverview = () => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        commissionEarned: 0,
        activeProviders: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [pendingProviders, setPendingProviders] = useState([]);
    const [dbError, setDbError] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [bSnap, pSnap, cSnap] = await Promise.all([
                    getDocs(collection(db, 'bookings')),
                    getDocs(collection(db, 'providers')),
                    getDocs(collection(db, 'commissions'))
                ]);

                const bookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const commissions = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
                const activeProvidersCount = providers.filter(p => p.status === 'active').length;

                const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission || 0), 0);
                const totalRevenue = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

                setStats({
                    totalBookings: bookings.length,
                    pendingBookings: pendingBookingsCount,
                    totalRevenue: totalRevenue,
                    commissionEarned: totalCommission,
                    activeProviders: activeProvidersCount
                });

                // Get top 3 recent bookings (simulated by taking the last 3)
                setRecentBookings([...bookings].reverse().slice(0, 3));

                // Get pending providers
                setPendingProviders(providers.filter(p => p.status === 'pending'));
            } catch (err) {
                console.error('Firebase Firestore error:', err);
                setDbError(true);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            {dbError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <span><strong>Database connection error.</strong> Could not fetch data from Firestore. Check your Firebase credentials and Firestore rules.</span>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={CalendarDays} colorClass="bg-blue-500" />
                <StatCard title="Pending Bookings" value={stats.pendingBookings} icon={Briefcase} colorClass="bg-amber-500" />
                <StatCard title="Active Providers" value={stats.activeProviders} icon={Users} colorClass="bg-indigo-500" />
                <StatCard title="Commission Earned" value={`₹${stats.commissionEarned}`} icon={DollarSign} colorClass="bg-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings Stub */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                        Recent Bookings <Link to="/admin/bookings" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </h3>
                    {recentBookings.length > 0 ? (
                        <div className="space-y-4">
                            {recentBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                    <div>
                                        <p className="font-semibold text-gray-900">{b.service}</p>
                                        <p className="text-xs text-gray-500">{b.customer} • {b.provider}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">₹{b.proposedPrice || b.price}</p>
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${b.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            b.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                                b.status === 'negotiating' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {b.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm py-8 text-center border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
                            No recent bookings found
                        </div>
                    )}
                </div>

                {/* Pending Provider Approvals Stub */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                        Pending Approvals <Link to="/admin/providers" className="text-sm text-blue-600 hover:underline">Review All</Link>
                    </h3>
                    {pendingProviders.length > 0 ? (
                        <div className="space-y-4">
                            {pendingProviders.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.category} • {p.phone}</p>
                                        </div>
                                    </div>
                                    <Link to="/admin/providers" className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-sm rounded-lg transition-colors">
                                        Review
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm py-8 text-center border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
                            No pending provider approvals
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
