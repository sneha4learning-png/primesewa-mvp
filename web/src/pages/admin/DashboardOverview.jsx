import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, DollarSign, CalendarDays, Clock, MapPin, CheckCircle2, Star, TrendingUp, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

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

const DashboardOverview = () => {
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
    const [topProviders, setTopProviders] = useState([]);


    useEffect(() => {
        // 1. Real-time stats and data
        const unsubBookings = onSnapshot(collection(db, 'bookings'), (bSnap) => {
            const allBookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // 2. Real-time providers
            const unsubProviders = onSnapshot(collection(db, 'providers'), (pSnap) => {
                const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Count completed requests per provider
                const completedCounts = new Map();
                allBookings.forEach(b => {
                    if (b.status === 'completed') {
                        const count = completedCounts.get(b.provider) || 0;
                        completedCounts.set(b.provider, count + 1);
                    }
                });

                const bookings = allBookings;
                const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
                const activeProvidersCount = providers.filter(p => p.status === 'active').length;

                let totalCommission = 0;
                let totalRevenue = 0;

                const completedBookings = bookings.filter(b => b.status === 'completed');
                completedBookings.forEach(b => {
                    const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                    const amount = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                    totalRevenue += amount;
                    totalCommission += amount * 0.15;
                });

                // Generate Chart Data (Last 7 Days)
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { weekday: 'short' }), bookings: 0, revenue: 0 };
                });

                bookings.forEach(b => {
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

                // Deduplicate providers by name, prioritizing those with higher ratings/jobs
                const uniqueProvidersMap = new Map();
                providers.forEach(p => {
                    const nameKey = (p.name || '').toLowerCase().trim();
                    if (!nameKey) return;
                    const existing = uniqueProvidersMap.get(nameKey);
                    
                    const pRating = parseFloat(p.rating) || 0;
                    const eRating = existing ? (parseFloat(existing.rating) || 0) : 0;
                    const pJobs = parseInt(p.jobs) || completedCounts.get(p.name) || 0;
                    const eJobs = existing ? (parseInt(existing.jobs) || completedCounts.get(existing.name) || 0) : 0;

                    if (!existing || pRating > eRating || (pRating === eRating && pJobs > eJobs)) {
                        uniqueProvidersMap.set(nameKey, p);
                    }
                });

                const uniqueProviders = Array.from(uniqueProvidersMap.values());

                // Top 5 Providers
                const activeProvs = uniqueProviders.filter(p => p.status === 'active').map(p => ({
                    ...p,
                    jobs: parseInt(p.jobs) || completedCounts.get(p.name) || 0
                }));
                activeProvs.sort((a, b) => {
                    const jobsA = a.jobs || 0;
                    const jobsB = b.jobs || 0;
                    
                    // Prioritize those with jobs
                    if (jobsA > 0 && jobsB === 0) return -1;
                    if (jobsA === 0 && jobsB > 0) return 1;

                    const ratingA = parseFloat(a.rating) || 0;
                    const ratingB = parseFloat(b.rating) || 0;
                    if (ratingB !== ratingA) return ratingB - ratingA;
                    return jobsB - jobsA;
                });
                setTopProviders(activeProvs.slice(0, 5));

                const unsubPayouts = onSnapshot(collection(db, 'payouts'), (paySnap) => {
                    const payouts = paySnap.docs.map(d => d.data());
                    const pendingPayoutsTotal = payouts.filter(p => p.status === 'pending').reduce((a, c) => a + (c.amount || 0), 0);
                    
                    setStats(prev => ({
                        ...prev,
                        totalBookings: bookings.length,
                        pendingBookings: pendingBookingsCount,
                        totalRevenue: totalRevenue,
                        commissionEarned: totalCommission,
                        activeProviders: activeProvidersCount,
                        pendingPayouts: pendingPayoutsTotal
                    }));
                }, (err) => {
                    console.error('Payouts Listener Error:', err);
                });

                const sortedRecent = [...bookings].sort((a, b) => {
                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.date || 0).getTime();
                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.date || 0).getTime();
                    return timeB - timeA;
                });

                setRecentBookings(sortedRecent.filter(b => b.status !== 'rejected' && b.status !== 'cancelled').slice(0, 6));
                setRecentDeclined(sortedRecent.filter(b => b.status === 'rejected' || b.status === 'cancelled').slice(0, 6));

                // Get pending providers (robust check for missing status field)
                setPendingProviders(providers.filter(p => (p.status === 'pending' || !p.status)));
                 return () => unsubPayouts();
            }, (err) => {
                console.error('Providers Listener Error:', err);
                setDbError(true);
            });

            // Improved patcher with better randomization and loop protection
            const unsubProvPatch = onSnapshot(collection(db, 'providers'), async (snap) => {
                const neighborhoods = [
                    ['Vastrapur', 'Satellite', 'Bopal'],
                    ['SG Highway', 'Prahlad Nagar', 'Ghatlodia'],
                    ['Maninagar', 'Naroda', 'Nikol'],
                    ['C.G. Road', 'Navrangpura', 'Paldi'],
                    ['Chandkheda', 'Motera', 'Sabarmati'],
                    ['Naranpura', 'Memnagar', 'Guraul'],
                    ['South Bopal', 'Ambawadi', 'Vasna']
                ];
                
                for (const d of snap.docs) {
                    const p = d.data();
                    // Multi-flag check: If they ONLY have the city name or no areas at all
                    const isGeneric = !p.serviceAreas || p.serviceAreas.length === 0 || p.location === 'Ahmedabad' || p.location === 'Ahmedabad Location';
                    
                    if (isGeneric) {
                        const ref = doc(db, 'providers', d.id);
                        // Assign a neighborhood set based on their ID string to ensure variety and stability
                        const index = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % neighborhoods.length;
                        const selected = neighborhoods[index];
                        
                        await updateDoc(ref, { 
                            serviceAreas: selected, 
                            location: selected.join(', '),
                            patchApplied: true // Guard flag
                        });
                    }
                }
            });

            return () => { unsubProviders(); unsubProvPatch(); };
        }, (err) => {
            console.error('Bookings Listener Error:', err);
            setDbError(true);
        });

        return () => unsubBookings();
    }, []);

    return (
        <div className="space-y-6">
            {dbError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <span><strong>Database connection error.</strong> Could not fetch data from Firestore. Check your Firebase credentials and Firestore rules.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={CalendarDays} colorClass="bg-blue-500" />
                <StatCard title="Pending Jobs" value={stats.pendingBookings} icon={Briefcase} colorClass="bg-amber-500" />
                <StatCard title="Active Pros" value={stats.activeProviders} icon={Users} colorClass="bg-indigo-500" />
                <StatCard title="Revenue (15%)" value={`₹${stats.commissionEarned.toFixed(0)}`} icon={BarChartIcon} colorClass="bg-emerald-500" />
                <StatCard title="Pending Payouts" value={`₹${stats.pendingPayouts.toFixed(0)}`} icon={DollarSign} colorClass="bg-rose-500" />
            </div>

            {/* Analytical Reports Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" /> Booking Trend (7 Days)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold', color: '#4f46e5' }}
                                />
                                <Area type="monotone" dataKey="bookings" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" /> Revenue Trend (7 Days)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold', color: '#10b981' }}
                                    formatter={(value) => [`₹${value}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top 5 Providers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-normal text-gray-800 mb-4 flex items-center justify-between">
                    Top Rated Providers <Link to="/admin/providers" className="text-sm text-blue-600 hover:underline">View All</Link>
                </h3>
                {topProviders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topProviders.map((p, index) => (
                            <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white relative overflow-hidden group">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-300' : index === 2 ? 'bg-amber-700' : 'bg-transparent'}`}></div>
                                <div className="flex items-center gap-4 ml-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-normal text-lg border border-slate-200">
                                        {(p.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-normal text-slate-900 leading-tight">{p.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{(p.category || 'No Category')} Specialist</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`flex items-center justify-end gap-1 ${p.rating > 0 ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-50 border-slate-100'} px-2 py-0.5 rounded text-sm font-normal border mb-1`}>
                                        {p.rating > 0 ? (
                                            <>
                                                <Star className="w-3.5 h-3.5 fill-current" /> {Number(p.rating).toFixed(1)}
                                            </>
                                        ) : (
                                            <span className="text-[10px] uppercase tracking-widest px-1">New</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 font-normal uppercase tracking-wider">{p.jobs || 0} Jobs</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                        Not enough data to determine top providers
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings Stub */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-normal text-gray-800 mb-4 flex items-center justify-between">
                        Recent Bookings <Link to="/admin/bookings" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </h3>
                    {recentBookings.length > 0 ? (
                        <div className="space-y-4">
                            {recentBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                    <div>
                                        <p className="font-normal text-gray-900">{b.service}</p>
                                        <p className="text-xs text-gray-500">{b.customer || 'Unknown'} • {b.provider || 'Unassigned'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-normal text-gray-900">₹{(b.proposedPrice || b.price || 0).toFixed(0)}</p>
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-wider ${b.status === 'completed' ? 'bg-green-100 text-green-700' :
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
                    <h3 className="text-lg font-normal text-gray-800 mb-4 flex items-center justify-between">
                        Pending Approvals <Link to="/admin/providers" state={{ status: 'pending' }} className="text-sm text-blue-600 hover:underline">Review All</Link>
                    </h3>
                    {pendingProviders.length > 0 ? (
                        <div className="space-y-4">
                            {pendingProviders.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-normal">
                                            {(p.name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-normal text-gray-900">{p.name}</p>
                                            <p className="text-xs text-gray-500">{(p.category || 'No Category')} • {p.phone}</p>
                                        </div>
                                    </div>
                                    <Link to="/admin/providers" state={{ searchTerm: p.name }} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-sm rounded-lg transition-colors">
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

            {/* Declined Bookings Section */}
            {recentDeclined.length > 0 && (
                <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-6 shadow-sm">
                    <h3 className="text-lg font-normal text-rose-900 mb-4 flex items-center gap-2">
                        Recent Declined Requests
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {recentDeclined.map(b => (
                            <div key={b.id} className="flex flex-col p-4 rounded-lg bg-white border border-rose-100 shadow-sm opacity-90 transition-opacity hover:opacity-100">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-normal text-slate-800">{b.service}</p>
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-wider ${b.status === 'cancelled' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {b.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 font-normal mb-1">👤 {b.customer}</p>
                                <p className="text-xs text-slate-500 font-medium mb-1">🔧 {b.provider}</p>
                                {(b.date || b.time) && (
                                    <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                        📅 {b.date || '—'}{b.time ? ` • 🕐 ${formatTime(b.time)}` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardOverview;
