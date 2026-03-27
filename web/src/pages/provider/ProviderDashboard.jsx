import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MapPin, Phone, IndianRupee, Clock, Wallet, Navigation, AlertTriangle, Calendar, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, doc, updateDoc, addDoc, query, where, serverTimestamp, onSnapshot, increment, getDocs, writeBatch } from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';

const ProviderDashboard = () => {
    const { currentUser, userData } = useAuth();
    const { sendNotification } = useNotifications();
    const [requests, setRequests] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [historicalBookings, setHistoricalBookings] = useState([]); // All bookings for history
    const [historyFilter, setHistoryFilter] = useState('All');
    const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
    const [negotiatingId, setNegotiatingId] = useState(null);
    const [negotiatedPrice, setNegotiatedPrice] = useState('');
    const [providerStatus, setProviderStatus] = useState('pending');
    const [dbError, setDbError] = useState(false);
    const [chartData, setChartData] = useState([]);

    // Pagination states
    const [activePage, setActivePage] = useState(1);
    const [requestPage, setRequestPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 3;

    useEffect(() => {
        const providerName = userData?.name || currentUser?.displayName;
        if (!providerName) return;

        // 1. Real-time listener for this provider's approval status
        let unsubscribeProvider = () => { };
        if (userData?.uid) {
            const providerQuery = query(collection(db, 'providers'), where('uid', '==', userData.uid));
            unsubscribeProvider = onSnapshot(providerQuery, (snap) => {
                if (!snap.empty) setProviderStatus(snap.docs[0].data().status);
            }, e => console.error(e));
        } else {
            setProviderStatus(userData?.status || 'pending');
        }

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

            setRequests(myBookings.filter(b => b.status === 'pending' || b.status === 'negotiating'));
            setActiveJobs(myBookings.filter(b => b.status === 'accepted'));
            setHistoricalBookings(myBookings);

            const completedJobs = myBookings.filter(b => b.status === 'completed');

            const calcEarnings = (fromDate) => completedJobs
                .filter(job => new Date(job.date || job.completedAt?.toDate?.() || 0) >= fromDate)
                .reduce((sum, job) => {
                    const rawPrice = job.proposedPrice || job.price || job.amount || 0;
                    const amt = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 500;
                    return sum + (amt * 0.85);
                }, 0);

            const now = new Date();
            const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
            const oneMonthAgo = new Date(); oneMonthAgo.setMonth(now.getMonth() - 1);
            setEarnings({
                today: calcEarnings(new Date(new Date().setHours(0, 0, 0, 0))),
                week: calcEarnings(oneWeekAgo),
                month: calcEarnings(oneMonthAgo)
            });

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
                        const rawPrice = job.proposedPrice || job.price || job.amount || 0;
                        const amt = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                        dayObj.earnings += amt * 0.85;
                    }
                }
            });
            setChartData(last7Days);
            setDbError(false);
        }, e => { console.error('Bookings listener error:', e); setDbError(true); });

        return () => {
            unsubscribeProvider();
            unsubscribeBookings();
        };
    }, [userData, currentUser]);

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
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
            await updateDoc(doc(db, 'bookings', req.id), { status: 'accepted' });
            setRequests(prev => prev.filter(r => r.id !== req.id));
            setActiveJobs(prev => [{ ...req, status: 'accepted' }, ...prev]);
            setHistoricalBookings(prev => prev.map(r => r.id === req.id ? { ...r, status: 'accepted' } : r));
            
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
            await updateDoc(doc(db, 'bookings', req.id), { status: 'negotiating', proposedPrice: parseInt(negotiatedPrice) });
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'negotiating', proposedPrice: parseInt(negotiatedPrice) } : r));
            setHistoricalBookings(prev => prev.map(r => r.id === req.id ? { ...r, status: 'negotiating', proposedPrice: parseInt(negotiatedPrice) } : r));
            setNegotiatingId(null);
            setNegotiatedPrice('');

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

            // Update requests and history state
            const req = requests.find(r => r.id === id);
            if (req) {
                setRequests(prev => prev.filter(r => r.id !== id));
            }
            setHistoricalBookings(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));

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

    const completeJob = async (job) => {
        const rawPrice = job.proposedPrice || job.price || job.amount || 0;
        const finalPrice = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 500;
        const netEarning = finalPrice * 0.85;
        const platformCut = finalPrice * 0.15;

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
                commission: parseFloat(platformCut.toFixed(2)),
                providerEarning: parseFloat(netEarning.toFixed(2)),
                service: job.service,
                customer: job.customer,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });

            await batch.commit();

            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            setHistoricalBookings(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed' } : j));

            // Notify Customer
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
            {/* Earnings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 text-indigo-50 font-medium tracking-wide text-sm uppercase">
                            <Wallet className="w-5 h-5 opacity-80" /> Today's Net
                        </div>
                        <h2 className="text-4xl font-black tracking-tight">₹{earnings.today.toFixed(0)}</h2>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col justify-center hover:shadow-lg transition-all duration-300">
                    <div className="text-slate-500 text-sm font-bold mb-3 uppercase tracking-wider">This Week</div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">₹{earnings.week.toFixed(0)}</h2>
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col justify-center hover:shadow-lg transition-all duration-300">
                    <div className="text-slate-500 text-sm font-bold mb-3 uppercase tracking-wider">This Month</div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">₹{earnings.month.toFixed(0)}</h2>
                </div>
            </div>

            {/* Chart Container */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm shadow-slate-200/50 mb-8">
                <h3 className="text-xl font-black text-slate-800 mb-6">Earnings (Last 7 Days)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="earnings" name="Earnings (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Active/Accepted Jobs */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            <Clock className="w-6 h-6 text-indigo-600" />
                        </div>
                        Active Jobs
                    </h2>
                    <div className="space-y-5">
                        {paginatedActive.map(job => (
                            <div key={job.id} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-3xl"></div>
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">{job.service}</h3>
                                        <p className="text-slate-400 font-bold text-sm tracking-wider mt-1">#{job.id}</p>
                                    </div>
                                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-sm border border-indigo-100">
                                        ₹{job.proposedPrice || job.price}
                                    </span>
                                </div>
                                <div className="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                        <div className="flex flex-col w-full">
                                            {job.houseNo ? (
                                                <div className="bg-slate-100 px-3 py-1 rounded-lg mb-2 border-l-4 border-indigo-500">
                                                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">Door / Flat No</span>
                                                    <span className="font-black text-slate-900 text-sm">{job.houseNo}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-amber-600 mb-1">⚠️ No house number</div>
                                            )}
                                            <span className="text-slate-600 text-sm leading-relaxed">{job.address}</span>
                                            {job.description && (
                                                <div className="mt-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                                                    <span className="text-[10px] uppercase font-black text-indigo-400 block tracking-widest mb-1">Issue Description</span>
                                                    <p className="text-xs font-medium text-slate-700 italic">"{job.description}"</p>
                                                </div>
                                            )}
                                            {job.location && (
                                                <div className="flex gap-2 mt-4">
                                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${job.location.lat},${job.location.lng}`} target="_blank" rel="noreferrer" className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20">
                                                        <Navigation className="w-3.5 h-3.5" /> G-Maps
                                                    </a>
                                                    <a href={`https://www.openstreetmap.org/directions?from=&to=${job.location.lat}%2C${job.location.lng}`} target="_blank" rel="noreferrer" className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200">
                                                        <MapPin className="w-3.5 h-3.5" /> OSM
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                        <a
                                            href={`tel:${job.customerPhone || job.phone || ''}`}
                                            className="text-blue-600 hover:text-blue-700 font-bold underline-offset-2 hover:underline"
                                            onClick={e => { if (!job.customerPhone && !job.phone) { e.preventDefault(); alert('Customer phone number not available for this booking.'); } }}
                                        >
                                            Call {job.customer}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{formatTime(job.time)}</span>
                                    </div>
                                </div>
                                {/* Live Tracker Status Buttons */}
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Update Your Status</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'enroute', label: '🚗 En Route', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                                            { key: 'arrived', label: '📍 Arrived', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                                            { key: 'inprogress', label: '🔧 In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
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
                                                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${s.color} ${isCurrent ? 'ring-2 ring-offset-1 ring-current bg-opacity-100' : ''} ${isPastOrCurrent ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                                >
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button onClick={() => completeJob(job)} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-[0.98]">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" /> Mark as Completed
                                </button>
                            </div>
                        ))}
                        {totalActivePages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-4 bg-white p-4 rounded-2xl border border-slate-100">
                                <button onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage === 1} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                                <span className="text-sm font-bold text-slate-600">{activePage} / {totalActivePages}</span>
                                <button onClick={() => setActivePage(p => Math.min(totalActivePages, p + 1))} disabled={activePage === totalActivePages} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                            </div>
                        )}
                        {activeJobs.length === 0 && (
                            <div className="p-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold">No active jobs. Accept requests to start earning!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Incoming Requests */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl relative">
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <AlertTriangle className="w-6 h-6 text-rose-500" />
                        </div>
                        Incoming Requests
                    </h2>
                    <div className="space-y-5">
                        {paginatedRequests.map(req => (
                            <div key={req.id} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50/50 transition-colors pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-5">
                                        <div>
                                            <h3 className="font-black text-xl text-slate-900">{req.service}</h3>
                                            <p className="text-slate-400 font-bold text-sm tracking-wider mt-1">#{req.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-slate-900">₹{req.proposedPrice || req.price}</div>
                                            <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-600 rounded">Net: ₹{((req.proposedPrice || req.price) * 0.85).toFixed(0)}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                            <div className="flex flex-col w-full">
                                                {/* Doorstep detail shown prominently */}
                                                {(req.houseNo || req.house) ? (
                                                    <div className="bg-slate-100 px-3 py-1 rounded-lg mb-2 border-l-4 border-indigo-500">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">Door / Flat No</span>
                                                        <span className="font-black text-slate-900 text-sm">{req.houseNo || req.house}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-amber-600 mb-1">⚠️ No house number provided</div>
                                                )}
                                                <span className="text-slate-600 text-sm leading-relaxed">{req.address}</span>
                                                {req.description && (
                                                    <div className="mt-3 bg-rose-50/30 p-3 rounded-xl border border-rose-100/30">
                                                        <span className="text-[10px] uppercase font-black text-rose-400 block tracking-widest mb-1">Issue Description</span>
                                                        <p className="text-xs font-medium text-slate-700 italic">"{req.description}"</p>
                                                    </div>
                                                )}
                                                {req.location && (
                                                    <div className="flex gap-2 mt-3">
                                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${req.location.lat},${req.location.lng}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-black hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                                            <Navigation className="w-2.5 h-2.5" /> Google Directions
                                                        </a>
                                                        <a href={`https://www.openstreetmap.org/directions?from=&to=${req.location.lat}%2C${req.location.lng}`} target="_blank" rel="noreferrer" className="text-[10px] text-slate-600 font-black hover:underline flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                            <MapPin className="w-2.5 h-2.5" /> OSM View
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{formatTime(req.time)}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                            <a
                                                href={`tel:${req.customerPhone || req.phone || ''}`}
                                                className="text-blue-600 hover:text-blue-700 font-bold underline-offset-2 hover:underline"
                                                onClick={e => { if (!req.customerPhone && !req.phone) { e.preventDefault(); alert('Customer phone number not available for this booking.'); } }}
                                            >
                                                Call {req.customer}
                                            </a>
                                        </div>
                                    </div>

                                    {req.status === 'negotiating' ? (
                                        <div className="flex gap-3">
                                            <div className="flex-1 py-3.5 bg-amber-50 border-2 border-amber-100 text-amber-700 font-bold rounded-2xl flex justify-center items-center gap-2">
                                                <Clock className="w-5 h-5" /> Quote Sent: ₹{req.proposedPrice} (Waiting for Customer)
                                            </div>
                                        </div>
                                    ) : negotiatingId === req.id ? (
                                        <div className="flex gap-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-indigo-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all shadow-inner"
                                                    placeholder="Your Price"
                                                    value={negotiatedPrice}
                                                    onChange={(e) => setNegotiatedPrice(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <button onClick={() => proposePrice(req)} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2">
                                                Send <Navigation className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setNegotiatingId(null)} className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95">
                                                <XCircle className="w-5 h-5 mx-auto" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button onClick={() => rejectRequest(req.id)} className="flex-[0.8] py-3.5 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-black rounded-2xl transition-all flex justify-center items-center gap-2 active:scale-[0.98]">
                                                Reject
                                            </button>
                                            <button onClick={() => setNegotiatingId(req.id)} className="flex-[1.2] py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 font-black rounded-2xl transition-all flex justify-center items-center gap-2 active:scale-[0.98]">
                                                <IndianRupee className="w-5 h-5" /> Propose Quote
                                            </button>
                                            <button onClick={() => acceptRequest(req)} className="flex-[1.2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex justify-center items-center gap-2 active:scale-[0.98] group-hover:-translate-y-0.5">
                                                Accept Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {totalRequestPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-4 bg-white p-4 rounded-2xl border border-slate-100">
                                <button onClick={() => setRequestPage(p => Math.max(1, p - 1))} disabled={requestPage === 1} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                                <span className="text-sm font-bold text-slate-600">{requestPage} / {totalRequestPages}</span>
                                <button onClick={() => setRequestPage(p => Math.min(totalRequestPages, p + 1))} disabled={requestPage === totalRequestPages} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                            </div>
                        )}
                        {requests.length === 0 && (
                            <div className="p-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-slate-500 font-bold">You're all caught up. <br /><span className="text-sm font-medium mt-1 inline-block">New requests will appear here.</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EC-009: Bookings History View */}
            {historicalBookings.length > 0 && (
                <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-slate-400" />
                            Booking History
                        </h3>
                        <select
                            value={historyFilter}
                            onChange={(e) => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
                            className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 outline-none"
                        >
                            <option value="All">All Bookings</option>
                            <option value="Pending">Pending & Quotes</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled & Rejected</option>
                        </select>
                    </div>
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                            No bookings found for the selected filter.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedHistory.map(job => (
                                <div key={job.id} className="bg-white p-5 rounded-box border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{job.service}</h4>
                                            <p className="text-xs text-slate-500">#{job.id}</p>
                                            {job.ratingGiven && (
                                                <div className="flex items-center gap-1 text-amber-500 mt-1">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                    <span className="text-xs font-bold w-full truncate">{Number(job.ratingGiven).toFixed(1)} Rating</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : job.status === 'cancelled' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-500 mb-1">
                                        ₹{job.proposedPrice || job.price || job.amount}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mb-2 border-t border-slate-50 pt-2 flex flex-col gap-1">
                                        <div className="flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                                            <div className="flex flex-col w-full">
                                                {job.houseNo ? (
                                                    <div className="bg-slate-50 px-2 py-0.5 rounded border-l-2 border-slate-400 mb-1">
                                                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-tight">House No</span>
                                                        <span className="font-bold text-slate-800 text-xs">{job.houseNo}</span>
                                                    </div>
                                                ) : null}
                                                <span className="line-clamp-2 text-slate-500 leading-tight">{job.address || 'Ahmedabad'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> {job.date} • {formatTime(job.time)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {totalHistoryPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 bg-white p-4 rounded-2xl border border-slate-100 w-fit mx-auto">
                            <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Prev</button>
                            <span className="text-sm font-bold text-slate-600">{historyPage} / {totalHistoryPages}</span>
                            <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="px-4 py-2 text-sm font-bold bg-slate-100 rounded-xl disabled:opacity-50">Next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProviderDashboard;
