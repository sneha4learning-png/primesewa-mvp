import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MapPin, Phone, IndianRupee, Clock, Wallet, Navigation, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const ProviderDashboard = () => {
    const { currentUser, userData } = useAuth();
    const [requests, setRequests] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
    const [negotiatingId, setNegotiatingId] = useState(null);
    const [negotiatedPrice, setNegotiatedPrice] = useState('');
    const [providerStatus, setProviderStatus] = useState('pending'); // Default to pending for safety

    useEffect(() => {
        // Use userData.name instead of currentUser.displayName
        const providerName = userData?.name || currentUser?.displayName;
        if (!providerName) return;

        const loadDb = async () => {
            if (userData?.uid) {
                try {
                    const qSnap = await getDocs(query(collection(db, 'providers'), where('uid', '==', userData.uid)));
                    if (!qSnap.empty) {
                        setProviderStatus(qSnap.docs[0].data().status);
                    }
                } catch (e) { console.error(e); }
            } else {
                setProviderStatus(userData?.status || 'pending');
            }

            try {
                const bookSnap = await getDocs(collection(db, 'bookings'));
                const allBookings = [];
                bookSnap.forEach(d => allBookings.push({ id: d.id, ...d.data() }));

                // Filter bookings meant for THIS provider
                const myBookings = allBookings.filter(b => b.provider === providerName);

                setRequests(myBookings.filter(b => b.status === 'pending'));
                setActiveJobs(myBookings.filter(b => b.status === 'accepted'));

                // Calculate earnings from completed jobs for this provider
                const completedJobs = myBookings.filter(b => b.status === 'completed');
                const totalEarned = completedJobs.reduce((sum, job) => sum + (job.price * 0.85), 0);

                setEarnings({
                    today: totalEarned,
                    week: totalEarned * 3, // Mock multiplier for demo
                    month: totalEarned * 12 // Mock multiplier for demo
                });
            } catch (e) { console.error(e); }
        };

        loadDb();
        const interval = setInterval(loadDb, 2000);
        return () => clearInterval(interval);

    }, [currentUser]);

    const acceptRequest = async (req) => {
        try {
            await updateDoc(doc(db, 'bookings', req.id), { status: 'accepted' });
            setRequests(prev => prev.filter(r => r.id !== req.id));
            setActiveJobs(prev => [{ ...req, status: 'accepted' }, ...prev]);
        } catch (e) { console.error(e); }
    };

    const proposePrice = async (req) => {
        if (!negotiatedPrice) return;
        try {
            await updateDoc(doc(db, 'bookings', req.id), { status: 'negotiating', proposedPrice: parseInt(negotiatedPrice) });
            setRequests(prev => prev.filter(r => r.id !== req.id));
            setNegotiatingId(null);
            setNegotiatedPrice('');
        } catch (e) { console.error(e); }
    };

    const rejectRequest = async (id) => {
        try {
            await updateDoc(doc(db, 'bookings', id), { status: 'rejected' });
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (e) { console.error(e); }
    };

    const completeJob = async (job) => {
        const finalTime = job.time || 'A moment ago';
        const finalPrice = job.proposedPrice || job.price || job.amount;

        try {
            await updateDoc(doc(db, 'bookings', job.id), { status: 'completed', time: finalTime, price: finalPrice });
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));

            // Optimistically update earnings
            const net = finalPrice * 0.85;
            setEarnings(prev => ({
                ...prev,
                today: prev.today + net,
                week: prev.week + net,
                month: prev.month + net
            }));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-8">
            {providerStatus === 'pending' && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                        <h3 className="text-amber-800 font-bold">Account Pending Approval</h3>
                        <p className="text-amber-700 text-sm mt-1">
                            Your application is currently being reviewed by our team. You will not receive any service requests until your account is approved.
                        </p>
                    </div>
                </div>
            )}

            {providerStatus === 'suspended' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                        <h3 className="text-red-800 font-bold">Account Suspended</h3>
                        <p className="text-red-700 text-sm mt-1">
                            Your account has been suspended by the administrator. Please contact support for more information.
                        </p>
                    </div>
                </div>
            )}

            {providerStatus === 'active' && (
                <>
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
                                {activeJobs.map(job => (
                                    <div key={job.id} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-3xl"></div>
                                        <div className="flex justify-between items-start mb-5">
                                            <div>
                                                <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">{job.service}</h3>
                                                <p className="text-slate-400 font-bold text-sm tracking-wider mt-1">#{job.id}</p>
                                            </div>
                                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-sm border border-indigo-100">
                                                ₹{job.price}
                                            </span>
                                        </div>
                                        <div className="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl">
                                            <div className="flex items-start gap-3">
                                                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" /> <span>{job.address}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-4 h-4 text-slate-400 shrink-0" /> <span className="text-blue-600 hover:text-blue-700 cursor-pointer font-bold">Call {job.customer}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{job.time}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => completeJob(job)} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-[0.98]">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" /> Mark as Completed
                                        </button>
                                    </div>
                                ))}
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
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50/50 transition-colors pointer-events-none"></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-5">
                                                <div>
                                                    <h3 className="font-black text-xl text-slate-900">{req.service}</h3>
                                                    <p className="text-slate-400 font-bold text-sm tracking-wider mt-1">#{req.id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-slate-900">₹{req.price}</div>
                                                    <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-600 rounded">Net: ₹{(req.price * 0.85).toFixed(0)}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" /> <span>{req.address}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{req.time}</span>
                                                </div>
                                            </div>

                                            {negotiatingId === req.id ? (
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
                </>
            )}
        </div>
    );
};

export default ProviderDashboard;
