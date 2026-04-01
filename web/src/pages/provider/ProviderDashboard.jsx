import { useState, useEffect } from 'react';
import { CheckCircle, CheckCircle2, XCircle, MapPin, Phone, IndianRupee, Clock, Wallet, Navigation, AlertTriangle, AlertCircle, Calendar, Star, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import OSMMap from '../../components/OSMMap';
import { 
    collection, doc, updateDoc, query, where, 
    serverTimestamp, onSnapshot, increment, getDocs, 
    writeBatch, Timestamp 
} from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';

import { Component } from 'react';

// Prevents any crash inside ProviderDashboard from showing a completely blank page
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error) { console.error('ProviderDashboard Error:', error); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-rose-100 shadow-xl shadow-rose-900/5 max-w-2xl mx-auto my-12">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Something went wrong</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                        We encountered an error while loading your dashboard contents. Our team has been notified.
                        <br/><span className="text-[10px] text-rose-400 font-mono mt-2 block">{this.state.error?.message}</span>
                    </p>
                    <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">Reload Dashboard</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const ProviderDashboardContent = () => {
    const { currentUser, userData } = useAuth();
    const { sendNotification } = useNotifications();
    const [requests, setRequests] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [, setPayouts] = useState([]);
    const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, pendingPayouts: 0 });
    const [confirmingJobId, setConfirmingJobId] = useState(null);
    const [finalAmountAdjust, setFinalAmountAdjust] = useState('');
    const [chartData, setChartData] = useState([]);
    const [successRateData, setSuccessRateData] = useState([]);

    const [historicalBookings, setHistoricalBookings] = useState([]);
    const [historyFilter, setHistoryFilter] = useState('All');
    const [dbError, setDbError] = useState(false);
    const [negotiatedPrice, setNegotiatedPrice] = useState('');
    const [negotiatingId, setNegotiatingId] = useState(null);

    // Pagination states
    const [activePage, setActivePage] = useState(1);
    const [requestPage, setRequestPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 3;
    const providerName = userData?.name || currentUser?.displayName;

    useEffect(() => {
        if (!providerName) return;

        // 1. Provider status is handled by ProviderLayout (the parent).
        let unsubscribeProvider = () => {};

        // 2. Real-time listener for ALL bookings assigned to this provider
        const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const allBookings = [];
            snapshot.forEach(d => allBookings.push({ id: d.id, ...d.data() }));

            // Filter to only THIS provider's bookings, newest first
            const myBookings = allBookings
                .filter(b => b.provider === providerName)
                .sort((a, b) => {
                    const tA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000 || new Date(a.date || 0).getTime();
                    const tB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000 || new Date(b.date || 0).getTime();
                    return tB - tA;
                });

            // Ensure no duplicate IDs enter state (SAFETY CRITICAL)
            const uniqueMap = new Map();
            myBookings.filter(b => b.provider === providerName).forEach(b => uniqueMap.set(b.id, b));
            const myLiveBookings = Array.from(uniqueMap.values()); // REMOVED .slice(0, 5) to allow seeing all relevant jobs

            setRequests(myLiveBookings.filter(b => b.status === 'pending' || b.status === 'negotiating'));
            setActiveJobs(myLiveBookings.filter(b => b.status === 'accepted'));
            setHistoricalBookings(myLiveBookings);

            const completedJobs = myLiveBookings.filter(b => b.status === 'completed');

            const calcEarnings = (fromDate) => completedJobs
                .filter(job => {
                    const jobDate = new Date(job.date || (job.completedAt?.toDate ? job.completedAt.toDate() : 0));
                    return jobDate >= fromDate;
                })
                .reduce((sum, job) => {
                    const rawPrice = job.price || job.proposedPrice || job.amount || 0;
                    const amt = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                    return sum + Math.floor(Number(amt) * 0.85);
                }, 0);

            const now = new Date();
            const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
            const oneMonthAgo = new Date(); oneMonthAgo.setMonth(now.getMonth() - 1);
            setEarnings(prev => ({
                ...prev,
                today: calcEarnings(new Date(new Date().setHours(0, 0, 0, 0))),
                week: calcEarnings(oneWeekAgo),
                month: calcEarnings(oneMonthAgo)
            }));

            // Chart: last 7 days earnings
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { weekday: 'short' }), earnings: 0 };
            });
            completedJobs.forEach(job => {
                const jDateStr = job.date || (job.completedAt?.toDate ? job.completedAt.toDate().toISOString().split('T')[0] : null);
                if (jDateStr) {
                    const dayObj = last7Days.find(d => d.date === jDateStr);
                    if (dayObj) {
                        const rawPrice = job.price || job.proposedPrice || job.amount || 0;
                        const amt = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                        dayObj.earnings = (dayObj.earnings || 0) + Math.floor(Number(amt) * 0.85);
                    }
                }
            });
            setChartData([...last7Days]); // Ensure new reference for re-render
            
            // Success Rate Data
            const completedCount = completedJobs.length;
            const otherCount = myLiveBookings.length - completedCount;
            setSuccessRateData([
                { name: 'Completed', value: completedCount },
                { name: 'Other', value: otherCount }
            ]);

            setDbError(false);
        }, e => { console.error('Bookings listener error:', e); setDbError(true); });

        // DATABASE CLEANUP: Reset Payouts and Earnings per request
        const unsubscribePayouts = onSnapshot(query(collection(db, 'payouts'), 
            where('providerUid', '==', userData?.uid || currentUser?.uid || ''),
            where('status', '==', 'pending')
        ), (snapshot) => {
            const totalPending = snapshot.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
            setEarnings(prev => ({ ...prev, pendingPayouts: totalPending }));
            setPayouts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, e => console.error('Payouts listener error:', e));

        // Cleanup on unmount
        return () => {
            unsubscribeProvider();
            unsubscribeBookings();
            unsubscribePayouts();
        };
    }, [userData, currentUser, providerName]);

    // Update status when userData updates but listener isn't active
    // Remove sync from local component as Layout handles actual status overlays
    // This fixed a linting error and potential render cycle issue

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        if (timeStr.includes('-')) return timeStr;
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;

        let endHour = (hour + 1);
        const endAmpm = endHour >= 24 ? 'AM' : endHour >= 12 ? 'PM' : 'AM';
        endHour = endHour % 12 || 12;

        return `${displayHour}:${minutes} ${ampm} - ${endHour}:${minutes} ${endAmpm}`;
    };

    // Pagination logic
    const paginatedActive = activeJobs.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
    const paginatedRequests = requests.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage);

    const filteredHistory = historicalBookings.filter(b => {
        if (historyFilter === 'All') return true;
        if (historyFilter === 'Pending') return ['pending', 'negotiating'].includes(b.status);
        if (historyFilter === 'In Progress') return ['accepted'].includes(b.status);
        if (historyFilter === 'Completed') return ['completed'].includes(b.status);
        if (historyFilter === 'Cancelled') return ['cancelled', 'rejected'].includes(b.status);
        return true;
    });
    const paginatedHistory = filteredHistory.slice((historyPage - 1) * 6, historyPage * 6); // 6 for history grid

    const totalActivePages = Math.ceil(activeJobs.length / itemsPerPage);
    const totalRequestPages = Math.ceil(requests.length / itemsPerPage);
    const totalHistoryPages = Math.ceil(filteredHistory.length / 6);

    const acceptRequest = async (req) => {
        try {
            await updateDoc(doc(db, 'bookings', req.id), { 
                status: 'accepted',
                providerUid: userData.uid // Sync UID for future notifications
            });
            
            // REMOVED manual state updates (setRequests, setActiveJobs) as onSnapshot handles it automatically.
            
            // Notify Customer
            if (req.customerUid) {
                sendNotification(req.customerUid, 'Request Accepted', `${userData.name} has accepted your ${req.service} request and is starting soon.`, 'success');
            }

            // Notify Admin
            sendNotification('admin', 'Partner Accepted Request', `${userData.name} accepted the ${req.service} request from ${req.customer || 'a customer'}.`, 'info');
        } catch (e) { console.error(e); }
    };

    const proposePrice = async (req) => {
        if (!negotiatedPrice) return;
        try {
            await updateDoc(doc(db, 'bookings', req.id), { 
                status: 'negotiating', 
                proposedPrice: parseInt(negotiatedPrice),
                providerUid: userData.uid // Claim this booking with UID
            });
            setNegotiatingId(null);
            setNegotiatedPrice('');
            
            // REMOVED manual state updates (setRequests, setHistoricalBookings) as onSnapshot handles it automatically.

            // Notify Customer
            if (req.customerUid) {
                sendNotification(req.customerUid, 'New Quote Proposed', `${userData.name} proposed ₹${negotiatedPrice} for your ${req.service} request.`, 'info');
            }
            // Always notify Admin on price proposals
            sendNotification('admin', 'Partner Price Quote', `${userData.name} proposed ₹${negotiatedPrice} for ${req.service} to ${req.customer}.`, 'info');
        } catch (e) { console.error(e); }
    };

    const rejectRequest = async (id) => {
        try {
            await updateDoc(doc(db, 'bookings', id), { status: 'rejected' });

            // REMOVED manual state updates (setRequests, setHistoricalBookings) as onSnapshot handles it automatically.
            const req = requests.find(r => r.id === id);

            // Notify Customer
            if (req && req.customerUid) {
                sendNotification(req.customerUid, 'Request Declined', `${userData.name} is unavailable for the ${req.service} request.`, 'error');
            }

            // Notify Admin
            sendNotification('admin', 'Partner Declined Request', `${userData.name} declined the ${req?.service || 'service'} request from ${req?.customer || 'a customer'}.`, 'warning');
        } catch (e) { console.error(e); }
    };

    const updateTrackingStatus = async (job, status) => {
        try {
            await updateDoc(doc(db, 'bookings', job.id), { trackingStatus: status });
            setActiveJobs(prev => prev.map(j => j.id === job.id ? { ...j, trackingStatus: status } : j));
            setHistoricalBookings(prev => prev.map(j => j.id === job.id ? { ...j, trackingStatus: status } : j));

            // Notify Customer
            if (job.customerUid) {
                const statusLabels = { 'enroute': 'on the way', 'arrived': 'at your doorstep', 'inprogress': 'starting the work' };
                sendNotification(job.customerUid, 'Status Update', `${userData.name} is ${statusLabels[status] || status}.`, 'info');
            }
        } catch (e) { console.error('Tracking update error:', e); }
    };

    const completeJob = async (job, finalAdjustment = null) => {
        const rawPrice = job.proposedPrice || job.price || job.amount || 0;
        const originalPrice = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 500;
        
        const finalPrice = finalAdjustment ? parseInt(finalAdjustment) : originalPrice;
        const netEarning = Math.floor(finalPrice * 0.85); // Use Math.floor per user requirement for precise integer payouts
        const platformCut = finalPrice - netEarning;

        try {
            const batch = writeBatch(db);

            // Update booking status
            const bookingRef = doc(db, 'bookings', job.id);
            batch.update(bookingRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                price: finalPrice
            });

            // Increment the provider's job counter in the providers collection
            if (userData?.uid) {
                const providerRef = doc(db, 'providers', userData.uid);
                batch.update(providerRef, {
                    jobs: increment(1)
                });
            } else {
                // Fallback for sessions where UID might not be in userData (rare)
                const provName = job.provider || userData?.name;
                if (provName) {
                    const q = query(collection(db, 'providers'), where('name', '==', provName));
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        batch.update(doc(db, 'providers', qSnap.docs[0].id), {
                            jobs: increment(1)
                        });
                    }
                }
            }

            // Write commission record - this isn't strictly part of the provider's state but part of the transaction
            const commissionRef = doc(collection(db, 'commissions'));
            batch.set(commissionRef, {
                bookingId: job.id,
                provider: job.provider || userData?.name || 'Unknown',
                amount: finalPrice,
                commission: platformCut,
                providerEarning: netEarning,
                service: job.service,
                customer: job.customer,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });

            // Schedule Payout (7 days from now)
            const payoutDate = new Date();
            payoutDate.setDate(payoutDate.getDate() + 7);
            
            const payoutRef = doc(collection(db, 'payouts'));
            batch.set(payoutRef, {
                providerUid: userData.uid,
                providerName: userData.name,
                bookingId: job.id,
                service: job.service,
                amount: netEarning,
                status: 'pending',
                scheduledFor: payoutDate,
                createdAt: serverTimestamp()
            });

            await batch.commit();

            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            setHistoricalBookings(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed', price: finalPrice } : j));
            setConfirmingJobId(null);
            setFinalAmountAdjust('');
            if (job.customerUid) {
                sendNotification(job.customerUid, 'Job Completed', `${userData.name} has marked your ${job.service} as completed. Please rate the service!`, 'success');
            }

            // Notify Admin
            sendNotification('admin', 'Job Finalized', `${userData.name} completed the ${job.service} for ${job.customer}. Platform commission: ₹${platformCut.toFixed(2)}.`, 'success');

            // Optimistically update earnings display
            setEarnings(prev => ({
                ...prev,
                today: prev.today + netEarning,
                week: prev.week + netEarning,
                month: prev.month + netEarning
            }));
        } catch (e) { console.error('Error completing job:', e); }
    };

    return (
        <div className="space-y-8">
            {dbError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <span className="text-lg">⚠️</span>
                    <span><strong>Database connection error.</strong> Could not load bookings from Firestore. Check your Firebase credentials.</span>
                </div>
            )}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-8 flex items-start gap-4">
                            <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-indigo-900">7-Day Payment Hold Policy</h4>
                                <p className="text-xs text-indigo-700 font-normal leading-relaxed mt-1">
                                    To ensure safety and quality, all payouts are held for 7 days after job completion. You will see your verified earnings transferred automatically once the hold period expires.
                                </p>
                            </div>
                        </div>

            {/* Earnings Overview */}
            {/* Refined Earnings Overview - Wallet Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Today's Net</p>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <IndianRupee className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">₹{earnings.today.toFixed(0)}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[9px] uppercase tracking-widest">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Completed Today
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Safety Hold</p>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <Wallet className="w-5 h-5 text-amber-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">₹{earnings.pendingPayouts.toFixed(0)}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[9px] uppercase tracking-widest">
                            <Clock className="w-2.5 h-2.5" />
                            Pending Payout
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Weekly Gross</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">₹{earnings.week.toFixed(0)}</h3>
                        <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[9px] uppercase tracking-widest">
                            <Star className="w-3 h-3 fill-current" />
                            Active Week
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Monthly Reach</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">₹{earnings.month.toFixed(0)}</h3>
                        <p className="text-[9px] text-slate-400 font-medium tracking-tight">Across all completed jobs</p>
                    </div>
                </div>
            </div>

            {/* Chart Container - Professional Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Growth</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Earnings Trend (Net 85%)</p>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="earnings" name="Earnings" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Efficiency</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Success Rate Ratio</p>
                        </div>
                    </div>
                    <div className="h-64 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={successRateData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-2xl font-black text-slate-900 leading-none">
                                    {historicalBookings.length > 0 ? Math.round((successRateData[0]?.value / historicalBookings.length) * 100) : 0}%
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Success</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Active/Accepted Jobs */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-2xl">
                             <Clock className="w-6 h-6 text-emerald-600" />
                        </div>
                        In Field Now
                        <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full">{activeJobs.length}</span>
                    </h2>
                    <div className="space-y-5">
                        {paginatedActive.map(job => (
                            <div key={job.id} className="bg-indigo-950 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group border border-white/5">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-20 group-hover:scale-125 transition-transform duration-1000"></div>
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full mb-3 border border-white/10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                                <span className="text-white font-bold text-[8px] uppercase tracking-widest">{job.trackingStatus || 'Active Job'}</span>
                                            </div>
                                            <h3 className="text-2xl font-medium text-white tracking-tight leading-tight">{job.service}</h3>
                                            <div className="flex flex-col gap-2 mt-4">
                                                <div className="flex items-center gap-2 text-white/40 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span className="font-bold">{job.date} • {formatTime(job.slot)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/40 text-xs">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                                    <span className="truncate max-w-[200px]">{job.houseNo ? `${job.houseNo}, ${job.area}` : (job.address || 'Address registered')}</span>
                                                </div>
                                            </div>
                                            {/* LIVE OSM/GOOGLE TRACKER VIEW */}
                                            <div className="w-full h-32 rounded-[1.5rem] overflow-hidden border border-white/10 bg-indigo-900/50 mt-4 shadow-inner relative group">
                                                <OSMMap 
                                                    houseNo={job.houseNo} 
                                                    area={job.area} 
                                                    address={job.address} 
                                                    latitude={job.latitude} 
                                                    longitude={job.longitude} 
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-white tracking-tighter">₹{job.proposedPrice || job.price}</div>
                                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Expected Payout</p>
                                        </div>
                                    </div>

                                    {/* Action Tracking Bar - REFINED FOR VISIBILITY */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-white/10">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 text-center">Track Your Progress</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { key: 'enroute', label: 'En-Route', icon: Navigation, activeColor: 'bg-indigo-500 text-white border-indigo-400' },
                                                { key: 'arrived', label: 'Arrived', icon: MapPin, activeColor: 'bg-rose-500 text-white border-rose-400' },
                                                { key: 'inprogress', label: 'Working', icon: Zap, activeColor: 'bg-emerald-500 text-white border-emerald-400' },
                                            ].map((s) => {
                                                const statusOrder = { 'enroute': 1, 'arrived': 2, 'inprogress': 3 };
                                                const currentStatusLevel = job.trackingStatus ? statusOrder[job.trackingStatus] || 0 : 0;
                                                const thisStatusLevel = statusOrder[s.key];
                                                const isPastOrCurrent = currentStatusLevel >= thisStatusLevel;
                                                const isCurrent = job.trackingStatus === s.key;
                                                
                                                return (
                                                    <button
                                                        key={s.key}
                                                        onClick={() => updateTrackingStatus(job, s.key)}
                                                        disabled={isPastOrCurrent}
                                                        className={`py-4 px-2 rounded-2xl flex flex-col items-center gap-2 transition-all border shadow-lg ${isCurrent ? s.activeColor : (isPastOrCurrent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 opacity-50' : 'bg-white/10 border-white/10 text-white/60 hover:bg-white hover:text-indigo-950')}`}
                                                    >
                                                        <s.icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Customer</p>
                                            <p className="text-sm font-black text-white">{job.customer}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => window.open(`tel:${job.customerPhone || ''}`)}
                                                className="w-12 h-12 bg-white/10 hover:bg-white rounded-2xl flex items-center justify-center text-white hover:text-indigo-950 transition-all border border-white/10"
                                            >
                                                <Phone className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => setConfirmingJobId(job.id)}
                                                className="px-6 bg-white text-indigo-950 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 hover:text-white transition-all shadow-xl active:scale-95"
                                            >
                                                Complete
                                            </button>
                                        </div>
                                    </div>

                                    {confirmingJobId === job.id && (
                                        <div className="mt-8 pt-8 border-t border-white/20 animate-in slide-in-from-bottom duration-300">
                                            <p className="text-white/60 text-[10px] uppercase font-bold tracking-[0.2em] mb-4">Confirm Final Amount</p>
                                            <div className="flex gap-3">
                                                <input
                                                    type="number"
                                                    value={finalAmountAdjust}
                                                    onChange={(e) => setFinalAmountAdjust(e.target.value)}
                                                    className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white font-black outline-none focus:ring-2 ring-emerald-400"
                                                />
                                                <button onClick={() => completeJob(job, finalAmountAdjust)} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Confirm</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {totalActivePages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-4 bg-white p-4 rounded-2xl border border-slate-100">
                                <button onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage === 1} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                                <span className="text-sm font-normal text-slate-600">{activePage} / {totalActivePages}</span>
                                <button onClick={() => setActivePage(p => Math.min(totalActivePages, p + 1))} disabled={activePage === totalActivePages} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                            </div>
                        )}
                        {activeJobs.length === 0 && (
                            <div className="p-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-normal">No active jobs. Accept requests to start earning!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Incoming Requests (Urban Company Style) */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 rounded-2xl">
                             <AlertCircle className="w-6 h-6 text-rose-500" />
                        </div>
                        New Requests
                        <span className="text-[10px] bg-rose-500 text-white px-2.5 py-1 rounded-full">{requests.length}</span>
                    </h2>
                    <div className="space-y-6">
                        {paginatedRequests.map(req => (
                            <div key={req.id} className="group relative bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-700 overflow-hidden mb-6 last:mb-0">
                                {/* UC Background Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full translate-x-8 -translate-y-8 animate-pulse"></div>
                                
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-white shadow-xl">
                                            {(req.customer || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-950 tracking-tighter mb-1">{req.customer || 'Guest User'}</h3>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full w-fit">
                                                <Zap className="w-3 h-3 fill-current" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{req.serviceType || 'Job Request'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right bg-indigo-50/50 px-6 py-4 rounded-[1.5rem] border border-indigo-100/50 min-w-[140px]">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 leading-none">Job Value (Net)</p>
                                        <div className="text-3xl font-black text-indigo-600 tracking-tighter">₹{req.proposedPrice || req.price}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-[2.5rem] p-8 mb-8 border border-slate-100 relative overflow-hidden group-hover:bg-white transition-colors duration-500">
                                    <div className="flex flex-wrap items-center gap-2 mb-6">
                                        {((req.service || '').includes('(') ? (req.service.split('(')[1].replace(')', '').split(', ')) : [req.service]).map((s, i) => (
                                            <span key={i} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-200 border-2 border-white/10">{s}</span>
                                        ))}
                                    </div>
                                    
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 text-slate-600">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">{req.date}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-600">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                                <Clock className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time & Duration</span>
                                                <span className="text-xs font-black uppercase tracking-widest">{formatTime(req.slot || req.time)} • <span className="text-indigo-600">45-60 Mins</span></span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-600">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                                <MapPin className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px]">{req.address || 'Ahmedabad Location'}</span>
                                        </div>
                                    </div>
                                                <div className="flex gap-4">
                                        <button 
                                            onClick={() => acceptRequest(req)}
                                            className="flex-[2.5] bg-slate-950 text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-primary transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            Accept Request <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setNegotiatingId(negotiatingId === req.id ? null : req.id)}
                                            className={`flex-1 ${negotiatingId === req.id ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-100 text-slate-500'} h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-indigo-100 transition-all active:scale-95`}
                                        >
                                            Quote
                                        </button>
                                        <button 
                                            onClick={() => rejectRequest(req.id)}
                                            className="w-16 bg-white border-2 border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    {negotiatingId === req.id && (
                                        <div className="mt-8 pt-8 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Propose Your Net Value (₹)</p>
                                            <div className="flex gap-4">
                                                <input 
                                                    type="number" 
                                                    placeholder="eg. 899"
                                                    value={negotiatedPrice}
                                                    onChange={(e) => setNegotiatedPrice(e.target.value)}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-indigo-500 font-bold text-slate-900"
                                                />
                                                <button 
                                                    onClick={() => proposePrice(req)}
                                                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95"
                                                >
                                                    Send Proposal
                                                </button>
                                            </div>
                                        </div>
                                    )}                        </div>
                            </div>
                        ))}
                        {totalRequestPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-4 bg-white p-4 rounded-2xl border border-slate-100">
                                <button onClick={() => setRequestPage(p => Math.max(1, p - 1))} disabled={requestPage === 1} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                                <span className="text-sm font-normal text-slate-600">{requestPage} / {totalRequestPages}</span>
                                <button onClick={() => setRequestPage(p => Math.min(totalRequestPages, p + 1))} disabled={requestPage === totalRequestPages} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                            </div>
                        )}
                        {requests.length === 0 && (
                            <div className="p-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-slate-500 font-normal">You're all caught up. <br /><span className="text-sm font-medium mt-1 inline-block">New requests will appear here.</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EC-009: Bookings History View */}
            {historicalBookings.length > 0 && (
                <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-xl font-medium text-slate-800 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-slate-400" />
                            Booking History
                        </h3>
                        <select
                            value={historyFilter}
                            onChange={(e) => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
                            className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-normal text-slate-700 outline-none"
                        >
                            <option value="All">All Bookings</option>
                            <option value="Pending">Pending & Quotes</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled & Rejected</option>
                        </select>
                    </div>
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-normal border-2 border-dashed border-slate-200 rounded-2xl">
                            No bookings found for the selected filter.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedHistory.map(job => (
                                <div key={job.id} className="bg-white p-5 rounded-box border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-normal text-slate-800">{job.service}</h4>
                                            <p className="text-xs text-slate-500">#{job.id}</p>
                                            {job.ratingGiven && (
                                                <div className="flex flex-col gap-1 text-amber-500 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                        <span className="text-xs font-normal">{Number(job.ratingGiven).toFixed(1)} Rating</span>
                                                    </div>
                                                    {job.testimonial && (
                                                        <p className="text-[10px] text-slate-500 italic font-medium leading-tight mt-1 border-l-2 border-indigo-100 pl-2 py-0.5 line-clamp-2 hover:line-clamp-none transition-all">
                                                            "{job.testimonial}"
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider rounded-lg ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : job.status === 'cancelled' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-500 mb-1">
                                        ₹{job.price || job.proposedPrice || job.amount}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mb-2 border-t border-slate-50 pt-2 flex flex-col gap-1">
                                        <div className="flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                                            <div className="flex flex-col w-full">
                                                {job.houseNo ? (
                                                    <div className="bg-slate-50 px-2 py-0.5 rounded border-l-2 border-slate-400 mb-1">
                                                        <span className="text-[9px] uppercase font-normal text-slate-400 block tracking-tight">House No</span>
                                                        <span className="font-normal text-slate-800 text-xs">{job.houseNo}</span>
                                                    </div>
                                                ) : null}
                                                <span className="line-clamp-2 text-slate-500 leading-tight">{job.address || 'Ahmedabad'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> {job.date} • {job.slot || formatTime(job.time)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {totalHistoryPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 bg-white p-4 rounded-2xl border border-slate-100 w-fit mx-auto">
                            <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                            <span className="text-sm font-normal text-slate-600">{historyPage} / {totalHistoryPages}</span>
                            <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="px-4 py-2 text-sm font-normal bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProviderDashboard = () => (
    <ErrorBoundary>
        <ProviderDashboardContent />
    </ErrorBoundary>
);

export default ProviderDashboard;
