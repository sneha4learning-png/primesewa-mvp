import { useState, useEffect, Component } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, DollarSign, CalendarDays, Star, TrendingUp, BarChart as BarChartIcon, IndianRupee, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error) { console.error('Admin Dashboard Error:', error); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-rose-100 shadow-xl shadow-rose-900/5 max-w-2xl mx-auto my-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Something went wrong</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                        An error occurred while loading the admin analytics.
                        <br/><span className="text-[10px] text-rose-400 font-mono mt-2 block">{this.state.error?.message}</span>
                    </p>
                    <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const StatCard = ({ title, value, icon, colorClass }) => {
    const Icon = icon;
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-lg ${colorClass}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-normal text-gray-900">{value}</h3>
            </div>
        </div>
    );
};

// Converts 24-hour time string (e.g. "16:00") → AM/PM (e.g. "4:00 PM") — consistent with all panels
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const DashboardOverviewContent = () => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        commissionEarned: 0,
        activeProviders: 0,
        pendingPayouts: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentDeclined, setRecentDeclined] = useState([]);
    const [pendingProviders, setPendingProviders] = useState([]);
    const [dbError, setDbError] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [categoryMix, setCategoryMix] = useState([]);
    const [topProviders, setTopProviders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setDbError(false);

        // 1. Bookings & Revenue Listener (Drives Stats & Charts)
        const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const rawAll = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // ENFORCE PRODUCTION FILTRATION (ANALYTICS): Automatically hide mock data from analytics
            const mockNames = ["anjali premium beauty", "rajesh grooming studio", "test provider", "ace service partner", "new provider"].map(n => n.toLowerCase());
            const all = rawAll.filter(b => {
                const pName = (b.provider || '').toLowerCase().trim();
                return !mockNames.includes(pName);
            });

            let totalCommission = 0;
            let totalRevenue = 0;
            let totalPendingJobs = 0;
            
            all.forEach(b => {
                const isFinal = ['completed', 'cancelled', 'rejected'].includes(b.status);
                if (!isFinal) totalPendingJobs++;
                if (b.status === 'completed') {
                    const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                    const amount = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                    totalRevenue += amount;
                    // Standardize calculation to match precision in all dashboards (15% platform cut)
                    const providerShare = Math.floor(amount * 0.85);
                    const platformCut = amount - providerShare;
                    totalCommission += platformCut;
                }
            });

            // Modern View: Last 5 for table, but totals for cards
            const sorted = [...all].sort((a, b) => {
                    const tsA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds || 0) * 1000 || new Date(a.date || 0).getTime();
                    const tsB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds || 0) * 1000 || new Date(b.date || 0).getTime();
                    return tsB - tsA;
                });

            setRecentBookings(sorted.filter(b => !['cancelled', 'rejected'].includes(b.status)).slice(0, 6));
            setRecentDeclined(sorted.filter(b => ['cancelled', 'rejected'].includes(b.status)).slice(0, 6));

            setStats(prev => ({
                ...prev,
                totalBookings: all.length,
                pendingBookings: totalPendingJobs,
                totalRevenue,
                commissionEarned: totalCommission
            }));

            // Chart Data Generation
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { weekday: 'short' }), bookings: 0, revenue: 0 };
            });

            all.forEach(b => {
                const bDateStr = b.date || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString().split('T')[0] : null);
                if (bDateStr) {
                    const dayObj = last7Days.find(d => d.date === bDateStr);
                    if (dayObj) {
                        dayObj.bookings += 1;
                        if (b.status === 'completed') {
                            const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                            dayObj.revenue += typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                        }
                    }
                }
            });
            setChartData(last7Days);

            // Category Mix
            const mix = {};
            all.forEach(b => {
                const cat = b.serviceCategory || b.service?.split(' ')[0] || 'Other';
                mix[cat] = (mix[cat] || 0) + 1;
            });
            setCategoryMix(Object.entries(mix).map(([name, value]) => ({ name, value })));

            setIsLoading(false);
        }, (err) => {
            console.error("Bookings Listener Error:", err);
            setDbError(true);
        });

        // 2. Providers & Top Partners Listener
        const unsubProviders = onSnapshot(collection(db, 'providers'), (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const activeCount = fetched.filter(p => p.status === 'active').length;
            setPendingProviders(fetched.filter(p => p.status === 'pending' || !p.status));
            setStats(prev => ({ ...prev, activeProviders: activeCount }));
            
            const top = [...fetched]
                .filter(p => {
                    const isMock = p.id.startsWith('dev-prov-') || ["Test Provider", "Ace Service Partner", "New provider", "Anjali Premium Beauty", "Rajesh Grooming Studio"].includes(p.name);
                    return p.status === 'active' && !isMock && parseInt(p.jobs || 0) > 0; // ONLY SHOW IF JOBS > 0
                })
                .sort((a, b) => (parseInt(b.jobs || 0) - parseInt(a.jobs || 0)))
                .slice(0, 5);
            setTopProviders(top);
        }, (err) => console.error("Providers Listener Error:", err));

        // 3. Payouts Listener
        const unsubPayouts = onSnapshot(collection(db, 'payouts'), (snapshot) => {
            const total = snapshot.docs
                .map(d => d.data())
                .filter(p => p.status === 'pending')
                .reduce((a, c) => a + (Number(c.amount) || 0), 0);
            setStats(prev => ({ ...prev, pendingPayouts: Math.floor(total) }));
        }, (err) => console.error("Payouts Listener Error:", err));

        // 4. Data Hygiene Patcher
        const unsubPatch = onSnapshot(collection(db, 'providers'), async (snap) => {
            const neighborhoods = [['Vastrapur', 'Satellite', 'Bopal'], ['SG Highway', 'Prahlad Nagar', 'Ghatlodia']];
            for (const d of snap.docs) {
                const p = d.data();
                if (!p.patchApplied && (!p.serviceAreas || p.serviceAreas.length === 0)) {
                    const idx = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % neighborhoods.length;
                    await updateDoc(doc(db, 'providers', d.id), { serviceAreas: neighborhoods[idx], location: neighborhoods[idx].join(', '), patchApplied: true });
                }
            }
        });

        return () => { unsubBookings(); unsubProviders(); unsubPayouts(); unsubPatch(); };
    }, []);

    if (isLoading) return <div className="min-h-[400px] flex items-center justify-center text-indigo-600 font-medium tracking-wide">Initializing Analytics...</div>;

    return (
        <div className="space-y-6">
            {dbError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <span>Database connection error. Could not fetch data from Firestore.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={CalendarDays} colorClass="bg-gradient-to-br from-blue-500 to-blue-700" />
                <StatCard title="Pending Jobs" value={stats.pendingBookings} icon={Briefcase} colorClass="bg-gradient-to-br from-amber-500 to-orange-600" />
                <StatCard title="Active Pros" value={stats.activeProviders} icon={Users} colorClass="bg-gradient-to-br from-indigo-500 to-violet-700" />
                <StatCard title="Revenue (15%)" value={<div className="flex items-center"><IndianRupee className="w-4 h-4 mr-0.5"/>{stats.commissionEarned.toFixed(0)}</div>} icon={BarChartIcon} colorClass="bg-gradient-to-br from-emerald-500 to-teal-700" />
                <StatCard title="Pending Payouts" value={<div className="flex items-center"><IndianRupee className="w-4 h-4 mr-0.5"/>{Math.floor(stats.pendingPayouts)}</div>} icon={DollarSign} colorClass="bg-gradient-to-br from-rose-500 to-pink-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-8">
                        <TrendingUp className="w-5 h-5 text-indigo-500" /> Booking Volume
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="bookings" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorBookings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-8">
                        <DollarSign className="w-5 h-5 text-emerald-500" /> Revenue Stream
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`₹${v}`, 'Revenue']} />
                                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-8">
                        <PieChartIcon className="w-5 h-5 text-amber-500" /> Category Mix
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryMix} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                                    {categoryMix.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ee4444', '#8b5cf6'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-normal text-gray-800 mb-4">Top Rated Providers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topProviders.map((p, index) => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-white relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-normal text-lg">{(p.name || 'U').charAt(0).toUpperCase()}</div>
                                <div>
                                    <p className="font-normal text-slate-900 leading-tight">{p.name}</p>
                                    <p className="text-xs text-slate-500">{(p.category || 'No Category')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`flex items-center justify-end gap-1 ${(p.ratingCount > 0 && p.rating > 0) ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-50 border-slate-100'} px-2 py-0.5 rounded text-sm font-normal border mb-1`}>
                                    {(p.ratingCount > 0 && p.rating > 0) ? (
                                        <>
                                            <Star className="w-3.5 h-3.5 fill-current" /> {Number(p.rating).toFixed(1)}
                                        </>
                                    ) : (
                                        <span className="text-[10px] uppercase tracking-widest px-1">New</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-normal text-gray-800 mb-4">Recent Bookings</h3>
                    <div className="space-y-4">
                        {recentBookings.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                <div>
                                    <p className="font-normal text-gray-900">{b.service}</p>
                                    <p className="text-xs text-gray-500">{b.customer || 'Unknown'} • {b.provider || 'Unassigned'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        {b.ratingGiven && (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 italic">
                                                    <Star size={10} className="fill-current" />
                                                    <span className="text-[10px] font-black">{Number(b.ratingGiven || 0).toFixed(1)}</span>
                                                </div>
                                                {b.testimonial && <p className="text-[9px] text-slate-400 italic max-w-[120px] truncate">"{b.testimonial}"</p>}
                                            </div>
                                        )}
                                        <p className="font-normal text-gray-900 flex items-center"><IndianRupee className="w-3 h-3 mr-0.5"/>{(b.proposedPrice || b.price || 0).toFixed(0)}</p>
                                    </div>
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-wider ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {b.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-normal text-gray-800 mb-4">Pending Approvals</h3>
                    <div className="space-y-4">
                        {pendingProviders.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">{(p.name || 'U').charAt(0)}</div>
                                    <div>
                                        <p className="font-normal text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-500">{(p.category || 'No Category')}</p>
                                    </div>
                                </div>
                                <Link to="/admin/providers" className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-medium text-sm rounded-lg">Review</Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DashboardOverview = () => (
    <ErrorBoundary>
        <DashboardOverviewContent />
    </ErrorBoundary>
);

export default DashboardOverview;
