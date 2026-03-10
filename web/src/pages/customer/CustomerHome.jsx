import { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle, Phone, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Prevents any crash inside CustomerHome from showing a completely blank page
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error) { console.error('CustomerHome Error:', error); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center p-8">
                        <p className="text-red-600 font-bold text-xl mb-2">Something went wrong</p>
                        <p className="text-gray-500 text-sm mb-4">{this.state.error?.message}</p>
                        <button onClick={() => this.setState({ hasError: false })} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Try Again</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const categories = [
    { id: '1', name: 'Plumbing', icon: Droplets, color: 'bg-blue-100 text-blue-600' },
    { id: '2', name: 'Electrical', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { id: '3', name: 'Cleaning', icon: Sparkles, color: 'bg-emerald-100 text-emerald-600' },
    { id: '4', name: 'Carpentry', icon: Wrench, color: 'bg-orange-100 text-orange-600' },
    { id: '5', name: 'Painting', icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
    { id: '6', name: 'AC Repair', icon: Wrench, color: 'bg-cyan-100 text-cyan-600' },
    { id: '7', name: 'Appliance Repair', icon: Zap, color: 'bg-rose-100 text-rose-600' },
    { id: '8', name: 'Repair', icon: Wrench, color: 'bg-slate-100 text-slate-600' },
    { id: '9', name: 'Pest Control', icon: Sparkles, color: 'bg-red-100 text-red-600' },
    { id: '10', name: 'Salon & Beauty', icon: Sparkles, color: 'bg-pink-100 text-pink-600' },
    { id: '11', name: 'Packers & Movers', icon: Wrench, color: 'bg-indigo-100 text-indigo-600' },
];

const CustomerHome = () => {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookingStep, setBookingStep] = useState(0); // 0: lists, 1: form, 2: success
    const [mockProviders, setMockProviders] = useState([]);
    const [mockBookings, setMockBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [ratingState, setRatingState] = useState({ bookingId: null, rating: 0 });
    const [chartData, setChartData] = useState([]);

    // New Feature States
    const [ratingFilter, setRatingFilter] = useState('0');
    const [selectedProviderProfile, setSelectedProviderProfile] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingDesc, setBookingDesc] = useState('');
    const [bookingAddress, setBookingAddress] = useState('');
    const [timeError, setTimeError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [dbError, setDbError] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const serviceImages = [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1000&auto=format&fit=crop", // Plumbing
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1000&auto=format&fit=crop", // Electrical
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop", // Cleaning
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=1000&auto=format&fit=crop", // Carpentry
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1000&auto=format&fit=crop"  // Salon
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % serviceImages.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    // Returns current time as "HH:MM" string for today's minimum time constraint
    const getNowTimeStr = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const getTodayStr = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!userData?.uid) {
            // Not logged in: clear bookings and show guest view
            setMockBookings([]);
            setPastBookings([]);
            setChartData([]);
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        const myUid = userData.uid;

        // 1. Listen to online providers (real Firestore data)
        const activeOnlineQuery = query(
            collection(db, 'providers'),
            where('isOnline', '==', true)
        );

        const unsubscribeProviders = onSnapshot(activeOnlineQuery, (snapshot) => {
            const allProviders = [];
            snapshot.forEach(d => allProviders.push({ id: d.id, ...d.data() }));

            // Deduplicate by name — keep real UID records over old mock records
            const uniqueProvidersMap = new Map();
            allProviders.forEach(p => {
                const nameKey = (p.name || '').toLowerCase().trim();
                if (!nameKey) return;
                const existing = uniqueProvidersMap.get(nameKey);
                const pIsReal = !!p.uid && !p.uid.startsWith('mock-');
                const eIsReal = existing && !!existing.uid && !existing.uid.startsWith('mock-');
                if (!existing || (pIsReal && !eIsReal)) {
                    uniqueProvidersMap.set(nameKey, p);
                }
            });

            setMockProviders(Array.from(uniqueProvidersMap.values()));
            setLoadingData(false);
            setDbError(false);
        }, (err) => {
            console.error('Providers Listener Error:', err);
            setDbError(true);
            setLoadingData(false);
        });

        // 2. Listen to THIS user's bookings only — filter strictly by customerUid
        // Falls back to name-match for old bookings that predate the customerUid field
        const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const allMyBookings = [];
            snapshot.forEach(d => {
                const b = { id: d.id, ...d.data() };
                // Primary: match by UID (new bookings)
                const matchByUid = b.customerUid === myUid;
                // Fallback: name match ONLY for old bookings (no customerUid stored)
                const matchByName = !b.customerUid && (
                    (b.customer || '').toLowerCase() === (userData.name || '').toLowerCase()
                );
                if (matchByUid || matchByName) allMyBookings.push(b);
            });

            setMockBookings(allMyBookings.filter(b => b.status !== 'completed' && b.status !== 'rejected' && b.status !== 'cancelled'));
            const pBookings = allMyBookings.filter(b => b.status === 'completed');
            setPastBookings(pBookings);

            const categoryCounts = {};
            pBookings.forEach(b => {
                const cat = b.service || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            setChartData(Object.keys(categoryCounts).map(k => ({ name: k, value: categoryCounts[k] })));
        }, (err) => {
            console.error('Bookings Listener Error:', err);
        });

        return () => {
            unsubscribeProviders();
            unsubscribeBookings();
        };
    }, [userData]);

    const handleBook = (provider) => {
        // Safely parse price whether it's a string (e.g. '₹500/hr') or a number
        const rawPrice = provider.price;
        const parsedPrice = typeof rawPrice === 'number'
            ? rawPrice
            : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 500;

        const newBooking = {
            id: `B${Math.floor(Math.random() * 10000)}`,
            service: (Array.isArray(provider.category) ? provider.category.join(', ') : provider.category) || selectedCategory || 'Plumbing',
            status: 'pending',
            provider: provider.name || 'Provider',
            providerPhone: provider.phone || '',
            previousWorkSample: provider.previousWorkSample,
            customer: userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer'),
            price: parsedPrice
        };

        setPendingBookingData(newBooking);
        // Also store customer phone so provider can call
        newBooking.customerPhone = userData?.phone || '';
        setBookingDate('');
        setBookingTime('');
        setBookingDesc('');
        setBookingAddress('');
        setTimeError('');
        setSelectedProviderProfile(null);
        setBookingStep(1);
    };

    const confirmBooking = async (e) => {
        e.preventDefault();

        if (!userData || !userData.uid || userData.uid === 'mock-cust') {
            navigate('/login');
            return;
        }

        if (isSubmitting) return; // NT-015: prevent duplicate submissions

        // Validate: if today is selected, the chosen time must be in the future
        if (bookingDate === getTodayStr() && bookingTime) {
            const nowStr = getNowTimeStr();
            if (bookingTime <= nowStr) {
                setTimeError(`Please select a future time. Current time is ${nowStr}.`);
                return;
            }
        }
        setTimeError('');
        setIsSubmitting(true);
        setNetworkError(false);

        const finalBookingData = {
            service: pendingBookingData ? pendingBookingData.service : (selectedCategory || 'Plumbing'),
            status: 'pending',
            provider: pendingBookingData.provider,
            providerPhone: pendingBookingData.providerPhone || '',
            customer: userData?.name || 'Customer',
            customerUid: userData?.uid || '',
            customerPhone: pendingBookingData.customerPhone || userData?.phone || '',
            price: parseInt(pendingBookingData.price) || 500,
            date: bookingDate,
            time: bookingTime,
            description: bookingDesc,
            address: bookingAddress,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'bookings'), finalBookingData);
            setBookingStep(2);
            setTimeout(() => setBookingStep(0), 3000);
        } catch (err) {
            console.error("Error confirming booking:", err);
            setNetworkError(true); // EC-003: show retry message
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
            setMockBookings(prev => prev.filter(b => b.id !== bookingId));
        } catch (err) {
            console.error('Cancel error:', err);
        }
    };

    // Unified Filtering Logic
    const displayedProviders = mockProviders.filter(p => {
        // 1. Status Check
        if ((p.status || '').toLowerCase().trim() !== 'active') return false;

        // 2. Category Filter (Robust & Fuzzy)
        const matchesCategory = !selectedCategory || selectedCategory === 'All' || (() => {
            const pCats = (Array.isArray(p.category) ? p.category : [p.category || '']).map(c => String(c).toLowerCase().trim());
            const target = selectedCategory.toLowerCase().trim();

            return pCats.some(c => {
                if (c === target) return true;
                if (target === 'carpentry' && (c.includes('carpent') || c.includes('wood'))) return true;
                if (target === 'electrical' && (c.includes('electri') || c.includes('light'))) return true;
                if (target === 'plumbing' && (c.includes('plumb') || c.includes('pipe'))) return true;
                if (target === 'cleaning' && (c.includes('clean') || c.includes('housekeep'))) return true;
                return c.includes(target) || target.includes(c);
            });
        })();
        if (!matchesCategory) return false;

        // 3. Search Query
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (p.name || '').toLowerCase().includes(query) ||
                (Array.isArray(p.category) ? p.category.join(' ') : (p.category || '')).toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // 4. Rating Filter
        if (ratingFilter !== 'All Ratings') {
            const minRating = parseFloat(ratingFilter);
            if ((p.rating || 0) < minRating) return false;
        }

        return true;
    }).sort((a, b) => b.rating - a.rating);

    const handleActivityClick = (booking) => {
        // Removed intrusive alert popup that caused confusion about changing status
    };

    const handleNegotiation = async (id, accept, proposedPrice) => {
        try {
            if (accept) {
                await updateDoc(doc(db, 'bookings', id), { status: 'accepted', price: proposedPrice });
                setMockBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted', price: proposedPrice } : b));
            } else {
                await updateDoc(doc(db, 'bookings', id), { status: 'rejected' });
                setMockBookings(prev => prev.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitRating = async (booking) => {
        if (ratingState.rating > 0) {
            try {
                // Find Provider doc
                const q = query(collection(db, 'providers'), where('name', '==', booking.provider));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const pDoc = snap.docs[0];
                    const p = pDoc.data();
                    const currentRating = parseFloat(p.rating) || 5.0;
                    const jobs = parseInt(p.jobs) || 1;
                    const newRating = ((currentRating * jobs) + ratingState.rating) / (jobs + 1);
                    await updateDoc(doc(db, 'providers', pDoc.id), { rating: parseFloat(newRating.toFixed(1)) });
                }

                await updateDoc(doc(db, 'bookings', booking.id), { rated: true, ratingGiven: ratingState.rating });
                setRatingState({ bookingId: null, rating: 0 });
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Hero Section / Welcome Header */}
            <div className={`mb-12 relative overflow-hidden rounded-[3rem] ${!userData?.uid ? 'bg-slate-900 border border-slate-800 p-8 md:p-16' : ''}`}>
                <div className="absolute top-0 right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

                {!userData?.uid && (
                    <div className="absolute inset-0 z-0">
                        {serviceImages.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt="Service"
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-60' : 'opacity-0'}`}
                            />
                        ))}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/20"></div>
                    </div>
                )}

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-6xl font-black text-white md:text-slate-900 tracking-tight leading-tight">
                        {!userData?.uid ? (
                            <>
                                Premium Home <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 md:from-blue-600 md:to-indigo-600">
                                    Services in Ahmedabad
                                </span>
                            </>
                        ) : (
                            <>
                                Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    {userData.name?.split(' ')[0] || 'Prime User'}
                                </span> 👋
                            </>
                        )}
                    </h1>

                    {!userData?.uid ? (
                        <div className="mt-8 space-y-6">
                            <p className="text-lg md:text-xl font-medium text-slate-300 md:text-slate-500 leading-relaxed">
                                Book verified professionals for plumbing, electrical, cleaning and more. Experience quality and reliability at your doorstep.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button onClick={() => navigate('/login')} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-1">
                                    Book Now
                                </button>
                                <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black rounded-2xl border border-white/20 transition-all">
                                    Explore Services
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xl font-medium text-slate-500 mt-4">What service do you need today in Ahmedabad?</p>
                    )}
                </div>
            </div>

            {bookingStep === 1 ? (
                <div className="max-w-2xl bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 mx-auto relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <h2 className="text-3xl font-black mb-8 text-slate-900">Confirm Booking {pendingBookingData?.service ? <span className="text-blue-600 block text-xl mt-2">({pendingBookingData.service})</span> : ''}</h2>

                    {pendingBookingData?.previousWorkSample && (
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                Provider's Previous Work
                            </label>
                            <div className="rounded-2xl overflow-hidden h-40 border border-slate-200 shadow-sm relative group">
                                <img
                                    src={pendingBookingData.previousWorkSample}
                                    alt="Previous Work Sample"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        // Fallback to a clean placeholder if the provider's link (like imgur) is broken
                                        e.target.onerror = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&q=80';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <span className="text-white font-medium text-sm drop-shadow-md">Verified Work Sample</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={confirmBooking} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Service Date</label>
                                <div className="relative">
                                    <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        required
                                        type="date"
                                        value={bookingDate}
                                        min={getTodayStr()}
                                        onChange={(e) => { setBookingDate(e.target.value); setBookingTime(''); }}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Preferred Time</label>
                                <div className="relative">
                                    <ClockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        required
                                        type="time"
                                        value={bookingTime}
                                        min={bookingDate === getTodayStr() ? getNowTimeStr() : undefined}
                                        onChange={(e) => {
                                            const selected = e.target.value;
                                            // Guard: if today is selected, reject past times immediately
                                            if (bookingDate === getTodayStr() && selected && selected <= getNowTimeStr()) {
                                                setTimeError(`Please pick a time after ${getNowTimeStr()} for today.`);
                                                setBookingTime('');
                                            } else {
                                                setTimeError('');
                                                setBookingTime(selected);
                                            }
                                        }}
                                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 ${timeError ? 'border-red-400' : 'border-slate-200'}`}
                                    />
                                </div>
                                {timeError && (
                                    <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1">
                                        ⚠️ {timeError}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Service Address *</label>
                            <input required type="text" value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" placeholder="E.g., 404 Safal Profitaire, Corporate Road, Prahladnagar, Ahmedabad" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Issue Description (Optional)</label>
                            <input type="text" value={bookingDesc} onChange={(e) => setBookingDesc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" placeholder="E.g., Fan regulator is not working" />
                        </div>
                        {networkError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2">
                                ⚠️ Network error. Please check your connection and try again.
                            </div>
                        )}
                        <div className="pt-6 flex gap-4">
                            <button type="button" onClick={() => { setBookingStep(0); setNetworkError(false); }} className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 w-full transition-all">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className={`px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-white w-full shadow-lg shadow-indigo-600/30 transition-all ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1'}`}>
                                {isSubmitting ? 'Submitting...' : 'Confirm Request'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : bookingStep === 2 ? (
                <div className="max-w-lg bg-emerald-500 p-12 rounded-3xl mx-auto text-center flex flex-col items-center relative overflow-hidden shadow-2xl shadow-emerald-500/20">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] mix-blend-overlay opacity-20 bg-cover"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-emerald-500 mb-8 mx-auto animate-bounce shadow-xl">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4">Booking Confirmed!</h2>
                        <p className="text-emerald-50 text-lg font-medium">Your provider will be assigned shortly.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Search */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
                            <Search className="w-7 h-7 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for 'Electrician', 'Cleaning'..."
                                className="w-full pl-16 pr-6 py-6 bg-white border border-slate-200 rounded-3xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-medium text-slate-800 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {/* Categories */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Browse Services</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                                        className={`relative flex flex-col items-center p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                                            ${selectedCategory === cat.name
                                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/10 scale-[1.03]'
                                                : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-1'
                                            }`}
                                    >
                                        {selectedCategory === cat.name && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-2.5 transition-transform ${cat.color} ${selectedCategory === cat.name ? 'scale-110' : ''}`}>
                                            <cat.icon className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <span className={`text-xs md:text-sm font-bold text-center leading-tight ${selectedCategory === cat.name ? 'text-blue-700' : 'text-slate-700'}`}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Providers with Filters */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {selectedCategory ? `${selectedCategory} Pros` : 'Available Pros'}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-0.5">{displayedProviders.length} online now</p>
                                </div>
                                <select
                                    className="px-4 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={ratingFilter}
                                    onChange={(e) => setRatingFilter(e.target.value)}
                                >
                                    <option value="0">All Ratings</option>
                                    <option value="4.5">4.5+ Stars</option>
                                    <option value="4.0">4.0+ Stars</option>
                                    <option value="3.0">3.0+ Stars</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                {displayedProviders.slice(0, visibleCount).map(provider => (
                                    <div key={provider.id} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-0.5">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar with online indicator */}
                                            <div className="relative shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-md shadow-indigo-500/20">
                                                    {(provider.name || 'P').charAt(0)}
                                                </div>
                                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-lg text-slate-900 truncate">{provider.name || 'Service Partner'}</h3>
                                                </div>
                                                <p className="text-xs font-bold text-indigo-600 mt-0.5">{Array.isArray(provider.category) ? provider.category.join(', ') : (provider.category || 'Professional Service')}</p>
                                                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2">
                                                    <span className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                                        <Star className="w-3 h-3 fill-current" /> {provider.rating ? Number(provider.rating).toFixed(1) : '—'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">{provider.jobs || 0} jobs</span>
                                                    <span className="flex items-center gap-0.5 text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                        ₹{(provider.price || '').toString().replace(/[₹,/a-zA-Z\s]/g, '') || '—'}/hr
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
                                            <button onClick={() => setSelectedProviderProfile(provider)} className="flex-1 md:flex-none px-5 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl transition-all border border-slate-200 hover:border-blue-200 text-sm">
                                                View
                                            </button>
                                            <button onClick={() => handleBook(provider)} className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-sm">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {displayedProviders.length === 0 && (
                                    <div className="p-12 text-center bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-7 h-7 text-blue-400" />
                                        </div>
                                        <p className="text-slate-600 font-bold">No online providers for this category.</p>
                                        <p className="text-slate-400 text-sm mt-1">Check back soon or try another category.</p>
                                    </div>
                                )}
                                {visibleCount < displayedProviders.length && (
                                    <button
                                        onClick={() => setVisibleCount(c => c + 5)}
                                        className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                                    >
                                        Load More ({displayedProviders.length - visibleCount} remaining)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Active Bookings */}
                    <div className="space-y-8">
                        {/* Current Activity Box */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1 rounded-[2.5rem] shadow-xl shadow-blue-600/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2.3rem] min-h-[400px] flex flex-col">
                                {userData?.uid ? (
                                    <>
                                        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                            <MapPin className="text-blue-200" /> Current Activity
                                        </h2>
                                        <div className="space-y-4 relative z-10 flex-1">
                                            {mockBookings.length > 0 ? (
                                                mockBookings.map(b => (
                                                    <div key={b.id} onClick={() => handleActivityClick(b)} className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${b.status === 'negotiating' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="font-black text-slate-900">{b.service}</span>
                                                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${b.status === 'negotiating' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-500 mb-4">{b.date} at {b.time}</p>
                                                        <div className="flex justify-between items-end">
                                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-600">{b.provider.charAt(0)}</div>
                                                                {b.provider}
                                                            </p>
                                                            <p className="font-black text-slate-900 text-lg">₹{b.proposedPrice || b.price}</p>
                                                        </div>

                                                        {b.status === 'accepted' && (
                                                            <div className="mt-5 pt-4 border-t border-slate-100">
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Live Status</p>
                                                                <div className="relative flex justify-between px-2">
                                                                    <div className="absolute top-2.5 left-2 right-2 h-1 bg-slate-100 rounded"></div>
                                                                    <div className={`absolute top-2.5 left-2 h-1 rounded transition-all duration-500 ${b.trackingStatus === 'inprogress' ? 'w-[calc(100%-1rem)] bg-emerald-500' : b.trackingStatus === 'arrived' ? 'w-[66%] bg-blue-500' : b.trackingStatus === 'enroute' ? 'w-[33%] bg-blue-500' : 'w-0 bg-blue-500'}`}></div>
                                                                    {[{ step: 'assigned', label: 'Assigned' }, { step: 'enroute', label: 'On Way' }, { step: 'arrived', label: 'Arrived' }, { step: 'inprogress', label: 'Working' }].map((s, i) => {
                                                                        const isPast = b.trackingStatus === 'inprogress' ? true : b.trackingStatus === 'arrived' ? i <= 2 : b.trackingStatus === 'enroute' ? i <= 1 : i === 0;
                                                                        return (
                                                                            <div key={s.step} className="relative z-10 flex flex-col items-center gap-1.5 min-w-[3rem]">
                                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white ${isPast ? (b.trackingStatus === 'inprogress' ? 'border-emerald-500' : 'border-blue-500') : 'border-slate-200'}`}>
                                                                                    {isPast && <div className={`w-2 h-2 rounded-full ${b.trackingStatus === 'inprogress' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>}
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold text-center leading-tight ${isPast ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Negotiate buttons — only shown for negotiating status */}
                                                        {b.status === 'negotiating' && b.proposedPrice && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleNegotiation(b.id, false, b.proposedPrice); }}
                                                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                                                                >
                                                                    Decline
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleNegotiation(b.id, true, b.proposedPrice); }}
                                                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
                                                                >
                                                                    Accept ₹{b.proposedPrice}
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Cancel / Call buttons for active bookings */}
                                                        {(b.status === 'accepted' || b.status === 'pending') && (
                                                            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2" onClick={e => e.stopPropagation()}>
                                                                {b.status === 'accepted' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (!userData?.uid) { navigate('/login'); return; }
                                                                            if (!b.providerPhone && !b.phone) { alert('Provider phone number is not available.'); return; }
                                                                            window.location.href = `tel:${b.providerPhone || b.phone}`;
                                                                        }}
                                                                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl text-xs transition-colors border border-green-100"
                                                                    >
                                                                        <Phone className="w-3.5 h-3.5" /> Call Provider
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.id); }}
                                                                    className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors border border-red-100"
                                                                >
                                                                    Cancel Booking
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center text-white/60">
                                                    <ClockIcon className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="font-bold">No active requests.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <div className="relative w-48 h-48 mb-8 group">
                                            <div className="absolute inset-0 bg-white/20 rounded-[3rem] rotate-6 group-hover:rotate-0 transition-transform duration-500"></div>
                                            <div className="relative h-full w-full rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/30">
                                                {serviceImages.map((img, idx) => (
                                                    <img key={idx} src={img} alt="Service Pro" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Prime Quality</h3>
                                        <p className="text-white/70 text-sm font-medium leading-relaxed mb-8">Ahmedabad's most trusted professionals. Secure, fast, and reliable home services.</p>
                                        <button onClick={() => navigate('/login')} className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl shadow-xl hover:scale-105 transition-all text-sm uppercase tracking-widest">
                                            Sign In to Start
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* History / Testimonials Box */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
                            {userData?.uid ? (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-black text-slate-900">Recent Jobs</h2>
                                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-lg font-black">{pastBookings.length}</span>
                                    </div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {pastBookings.length > 0 ? (
                                            pastBookings.map(b => (
                                                <div key={b.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all flex justify-between items-center group">
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-wider">{b.service}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{b.provider} • {b.date || 'N/A'}</p>
                                                    </div>
                                                    <p className="font-black text-slate-900">₹{b.proposedPrice || b.price}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center text-slate-300">
                                                <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-bold">No history available</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="flex justify-center -space-x-3 mb-8">
                                        <div className="w-14 h-14 rounded-full border-4 border-white bg-blue-100 flex items-center justify-center text-2xl shadow-lg transform -rotate-12">🧹</div>
                                        <div className="w-14 h-14 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center text-2xl shadow-lg z-10 scale-110">⚡</div>
                                        <div className="w-14 h-14 rounded-full border-4 border-white bg-emerald-100 flex items-center justify-center text-2xl shadow-lg transform rotate-12">🚰</div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed italic px-4">
                                        "Found an amazing electrician in 5 minutes! Highly recommend PrimeSewa for anyone in Ahmedabad."
                                    </p>
                                    <div className="mt-6 flex flex-col items-center">
                                        <div className="flex gap-1 text-amber-400">
                                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">— Sneha P., Vastrapur</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Breakdown Chart — Only for logged in users */}
                        {userData?.uid && chartData.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                    Service Breakdown
                                </h2>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                                                {chartData.map((entry, index) => {
                                                    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                                })}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Provider Detail Modal — All fields null-safe */}
            {
                selectedProviderProfile && (() => {
                    const p = selectedProviderProfile;
                    const name = p.name || 'Provider';
                    const initial = name.charAt(0).toUpperCase();
                    const category = Array.isArray(p.category) ? p.category.join(', ') : (p.category || 'Professional Service');
                    const rating = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating) || 0;
                    const jobs = p.jobs || p.jobCount || 0;
                    const areas = Array.isArray(p.serviceAreas) && p.serviceAreas.length > 0
                        ? p.serviceAreas.join(', ')
                        : 'Ahmedabad';
                    const priceDisplay = p.price
                        ? (typeof p.price === 'string'
                            ? p.price.replace('₹', '').replace('/hr', '')
                            : p.price)
                        : '500';

                    return (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProviderProfile(null)}>
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0">
                                    <button onClick={() => setSelectedProviderProfile(null)} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="px-8 pb-8 -mt-12 relative">
                                    <div className="flex justify-between items-end mb-6">
                                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-4xl font-black text-indigo-600 border-4 border-white shadow-lg">
                                            {initial}
                                        </div>
                                        <div className="flex flex-col gap-2 mb-2 items-end">
                                            <button
                                                onClick={(e) => {
                                                    if (!userData?.uid) {
                                                        navigate('/login');
                                                        return;
                                                    }
                                                    if (!p.phone) {
                                                        alert('Phone number not available');
                                                        return;
                                                    }
                                                    window.location.href = `tel:${p.phone}`;
                                                }}
                                                className="px-8 py-2.5 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 transition-all shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <Phone className="w-4 h-4" /> Call Pro
                                            </button>
                                            <button onClick={() => handleBook(p)} className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 transition-all">
                                                Book This Pro
                                            </button>
                                        </div>
                                    </div>

                                    <h2 className="text-2xl font-black text-slate-900">{name}</h2>
                                    <p className="text-slate-500 font-medium">{category} Specialist • {areas}</p>

                                    <div className="grid grid-cols-3 gap-4 mt-8">
                                        <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
                                            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                                                <Star className="w-5 h-5 fill-current" />
                                            </div>
                                            <div className="text-xl font-black text-slate-900">{jobs > 0 ? rating.toFixed(1) : 'N/A'}</div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Rating</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                                            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="text-xl font-black text-slate-900">{jobs}</div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Jobs Done</div>
                                        </div>
                                        <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                                            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                                                <IndianRupee className="w-5 h-5" />
                                            </div>
                                            <div className="text-xl font-black text-slate-900">{priceDisplay}</div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Rate / Hr</div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-900 text-lg mb-4">Previous Work Portfolio</h3>
                                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                            <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80" alt="Work sample 1" className="w-48 h-32 object-cover rounded-2xl shadow-sm border border-slate-200 snap-center shrink-0" />
                                            <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80" alt="Work sample 2" className="w-48 h-32 object-cover rounded-2xl shadow-sm border border-slate-200 snap-center shrink-0" />
                                            <img src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80" alt="Work sample 3" className="w-48 h-32 object-cover rounded-2xl shadow-sm border border-slate-200 snap-center shrink-0" />
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-900 text-lg mb-4">Identity Verification</h3>
                                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-white">
                                                <img
                                                    src={p.proofDocument && p.proofDocument.startsWith('http') ? p.proofDocument : "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80"}
                                                    alt="ID Proof"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80"; }}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{p.idProofType || 'Identity Document'}</p>
                                                <p className="text-slate-800 font-bold">{p.idProofNumber || 'XXXX-XXXX-XXXX'}</p>
                                                <p className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded inline-block mt-2">✓ VERIFIED PARTNER</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 border-t border-slate-100 pt-8">
                                        <h3 className="font-bold text-slate-900 text-lg mb-4">Customer Reviews</h3>
                                        {jobs > 0 ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <div className="flex gap-2 text-amber-400 mb-2">
                                                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-current' : 'text-slate-300'}`} />)}
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium">"Very professional and quick service. Highly recommended!"</p>
                                                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-wide">- Verified Customer</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <div className="flex gap-2 text-amber-400 mb-2">
                                                        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium">"Arrived on time and solved the issue perfectly."</p>
                                                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-wide">- Verified Customer</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                                <p className="text-slate-400 font-medium text-sm">No reviews yet — be the first to book!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
        </div>
    );
};

export default function CustomerHomeWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <CustomerHome />
        </ErrorBoundary>
    );
}
