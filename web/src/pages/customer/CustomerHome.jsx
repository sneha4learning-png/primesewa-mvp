import { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle } from 'lucide-react';

const categories = [
    { id: '1', name: 'Plumbing', icon: Droplets, color: 'bg-blue-100 text-blue-600' },
    { id: '2', name: 'Electrical', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { id: '3', name: 'Cleaning', icon: Sparkles, color: 'bg-emerald-100 text-emerald-600' },
    { id: '4', name: 'Carpentry', icon: Wrench, color: 'bg-orange-100 text-orange-600' },
];

const CustomerHome = () => {
    const { userData } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookingStep, setBookingStep] = useState(0); // 0: lists, 1: form, 2: success
    const [mockProviders, setMockProviders] = useState([]);
    const [mockBookings, setMockBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [ratingState, setRatingState] = useState({ bookingId: null, rating: 0 });

    // New Feature States
    const [ratingFilter, setRatingFilter] = useState('0');
    const [selectedProviderProfile, setSelectedProviderProfile] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingAddress, setBookingAddress] = useState('');
    const [bookingDesc, setBookingDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadDb = async () => {
            const myName = userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer');

            try {
                const provSnap = await getDocs(collection(db, 'providers'));
                const allProviders = [];
                provSnap.forEach(d => allProviders.push({ id: d.id, ...d.data() }));

                // Deduplicate by phone to prevent multiple registrations from showing twice
                const uniqueProvidersMap = new Map();
                allProviders.forEach(p => {
                    if (p.phone && !uniqueProvidersMap.has(p.phone)) {
                        uniqueProvidersMap.set(p.phone, p);
                    } else if (!p.phone) {
                        uniqueProvidersMap.set(p.id, p); // Fallback if no phone
                    }
                });

                setMockProviders(Array.from(uniqueProvidersMap.values()).filter(p => p.status === 'active'));

                const bookSnap = await getDocs(collection(db, 'bookings'));
                const allMyBookings = [];
                bookSnap.forEach(d => {
                    const b = d.data();
                    if (b.customer === myName || b.customer === 'Guest User' || !b.customer) {
                        allMyBookings.push({ id: d.id, ...b });
                    }
                });

                setMockBookings(allMyBookings.filter(b => b.status !== 'completed' && b.status !== 'rejected'));
                setPastBookings(allMyBookings.filter(b => b.status === 'completed'));
            } catch (err) {
                console.error("Error loading DB", err);
            }
        };
        loadDb();
        const interval = setInterval(loadDb, 2000);
        return () => clearInterval(interval);
    }, [userData]);

    const handleBook = (provider) => {
        // Create a draft pending booking
        const newBooking = {
            id: `B${Math.floor(Math.random() * 10000)}`,
            service: selectedCategory || 'General Service',
            status: 'pending',
            provider: provider.name,
            customer: userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer'),
            price: parseInt(provider.price.replace('₹', '').replace('/hr', '')) || 500
        };

        setPendingBookingData(newBooking);
        setBookingDate('');
        setBookingTime('');
        setBookingAddress('');
        setBookingDesc('');
        setSelectedProviderProfile(null);
        setBookingStep(1);
    };

    const confirmBooking = async (e) => {
        e.preventDefault();

        const finalBookingData = {
            service: selectedCategory || 'General Service',
            status: 'pending',
            provider: pendingBookingData.provider,
            customer: userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer'),
            price: parseInt(pendingBookingData.price) || 500,
            date: bookingDate,
            time: bookingTime,
            address: bookingAddress,
            description: bookingDesc,
            createdAt: serverTimestamp()
        };

        setBookingStep(2);

        try {
            await addDoc(collection(db, 'bookings'), finalBookingData);
            setTimeout(() => setBookingStep(0), 3000);
        } catch (err) {
            console.error("Error confirming booking:", err);
            setBookingStep(0);
        }
    };

    // Filter providers based on category, rating, and search
    let displayedProviders = mockProviders.filter(p => p.status === 'active');

    if (selectedCategory) {
        displayedProviders = displayedProviders.filter(p => (p.category || 'Plumbing') === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        displayedProviders = displayedProviders.filter(p =>
            (p.name || '').toLowerCase().includes(query) ||
            (p.category || 'Plumbing').toLowerCase().includes(query)
        );
    } else if (!selectedCategory) {
        // If neither search nor category is active, slice to top 5 out-of-the-box
        displayedProviders = displayedProviders.slice(0, 5);
    }

    if (ratingFilter !== '0') {
        displayedProviders = displayedProviders.filter(p => p.rating >= parseFloat(ratingFilter));
    }

    // Sort so highest rating is first
    displayedProviders.sort((a, b) => b.rating - a.rating);

    const handleActivityClick = (booking) => {
        // We will replace this alert with actual UI or handle it inline.
        // Alert is fine for completed/pending/accepted, but negotiating needs action.
        if (booking.status !== 'negotiating') {
            alert(`Booking Details:\n\nID: ${booking.id}\nService: ${booking.service}\nStatus: ${booking.status.toUpperCase()}\nProvider: ${booking.provider}\nDate: ${booking.date}`);
        }
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
            {/* Welcome Header */}
            <div className="mb-12 relative">
                <div className="absolute top-0 right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{userData?.uid === 'mock-cust' ? 'Guest' : (userData?.name || 'User')}</span> 👋</h1>
                <p className="text-xl font-medium text-slate-500 mt-4 max-w-lg">What service do you need today in Ahmedabad?</p>
            </div>

            {bookingStep === 1 ? (
                <div className="max-w-2xl bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 mx-auto relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <h2 className="text-3xl font-black mb-8 text-slate-900">Confirm Booking</h2>
                    <form onSubmit={confirmBooking} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Service Date</label>
                                <div className="relative">
                                    <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input required type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Preferred Time</label>
                                <div className="relative">
                                    <ClockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input required type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Service Address</label>
                            <textarea required value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" rows="3" placeholder="Enter full address..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Issue Description (Optional)</label>
                            <input type="text" value={bookingDesc} onChange={(e) => setBookingDesc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" placeholder="E.g., Fan regulator is not working" />
                        </div>
                        <div className="pt-6 flex gap-4">
                            <button type="button" onClick={() => setBookingStep(0)} className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 w-full transition-all">Cancel</button>
                            <button type="submit" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-white hover:from-blue-700 hover:to-indigo-700 w-full shadow-lg shadow-indigo-600/30 hover:-translate-y-1 transition-all">Confirm Request</button>
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
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Categories</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                                        className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 ${selectedCategory === cat.name ? 'border-blue-500 bg-blue-50/50 shadow-md scale-100' : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-lg hover:-translate-y-1'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform ${cat.color} ${selectedCategory === cat.name ? 'scale-110' : ''}`}>
                                            <cat.icon className="w-8 h-8" />
                                        </div>
                                        <span className={`font-bold ${selectedCategory === cat.name ? 'text-blue-700' : 'text-slate-700'}`}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Providers with Filters */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCategory ? `${selectedCategory} Pros` : 'Top Rated Pros'}</h2>
                                <select
                                    className="px-4 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                                {displayedProviders.length > 0 ? displayedProviders.map(provider => (
                                    <div key={provider.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl hover:border-slate-200 transition-all duration-300">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500 rounded-full blur group-hover:blur-md transition-all opacity-20"></div>
                                                <div className="w-16 h-16 relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-2xl font-black text-slate-600 border-2 border-white shadow-sm">
                                                    {provider.name.charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl text-slate-900">{provider.name}</h3>
                                                <div className="flex items-center gap-3 text-sm font-bold text-slate-500 mt-2">
                                                    <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-md">
                                                        <Star className="w-4 h-4 fill-current" /> {provider.rating}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{provider.jobs} jobs</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{provider.price}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => setSelectedProviderProfile(provider)} className="px-6 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-all border border-blue-100">
                                                View Profile
                                            </button>
                                            <button onClick={() => handleBook(provider)} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 shadow-md shadow-slate-900/20 hover:shadow-blue-600/30 transition-all group-hover:-translate-y-0.5">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 font-medium">No active providers found for this category.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Active Bookings */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1 rounded-3xl shadow-xl shadow-blue-600/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[22px] min-h-[300px]">
                                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <MapPin className="text-blue-200" /> Current Activity
                                </h2>
                                <div className="space-y-4 relative z-10">
                                    {mockBookings.map(b => (
                                        <div key={b.id} onClick={() => handleActivityClick(b)} className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
                                            <div className={`absolute top-0 left-0 w-1.5 h-full ${b.status === 'negotiating' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="font-black text-slate-900">{b.service}</span>
                                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${b.status === 'negotiating' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>{b.status}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 mb-4">{b.date} at {b.time}</p>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-600">{b.provider.charAt(0)}</div>
                                                    {b.provider}
                                                </p>
                                                <p className="font-black text-slate-900 text-lg">₹{b.proposedPrice || b.price}</p>
                                            </div>

                                            {b.status === 'negotiating' && (
                                                <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3">
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
                                        </div>
                                    ))}
                                    {mockBookings.length === 0 && (
                                        <div className="text-center py-10">
                                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MapPin className="text-blue-200/50 w-8 h-8" />
                                            </div>
                                            <p className="text-blue-100 font-medium">No active requests.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Past Bookings & Ratings */}
                        {pastBookings.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                    <CheckCircle2 className="text-emerald-500 w-6 h-6" /> Past Bookings
                                </h2>
                                <div className="space-y-4">
                                    {pastBookings.map(b => (
                                        <div key={b.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-slate-900">{b.service}</span>
                                                <span className="text-sm font-black text-emerald-600">₹{b.proposedPrice || b.price}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 mb-4">{b.provider} • {b.date}</p>

                                            {!b.rated ? (
                                                <div className="mt-4 pt-4 border-t border-slate-200">
                                                    <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Rate {b.provider}</p>
                                                    <div className="flex items-center gap-2 mb-4 cursor-pointer">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                onClick={() => setRatingState({ bookingId: b.id, rating: star })}
                                                                className={`w-7 h-7 transition-all hover:scale-110 ${ratingState.bookingId === b.id && ratingState.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    {ratingState.bookingId === b.id && ratingState.rating > 0 && (
                                                        <button
                                                            onClick={() => submitRating(b)}
                                                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                                                        >
                                                            Submit Rating
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">You rated:</span>
                                                    <div className="flex gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-4 h-4 ${i < b.ratingGiven ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Provider Detail Modal */}
            {selectedProviderProfile && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                            <button onClick={() => setSelectedProviderProfile(null)} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-8 pb-8 -mt-12 relative">
                            <div className="flex justify-between items-end mb-6">
                                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-4xl font-black text-indigo-600 border-4 border-white shadow-lg">
                                    {selectedProviderProfile.name.charAt(0)}
                                </div>
                                <button onClick={() => handleBook(selectedProviderProfile)} className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-600/30 transition-all mb-2">
                                    Book This Pro
                                </button>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900">{selectedProviderProfile.name}</h2>
                            <p className="text-slate-500 font-medium">{selectedProviderProfile.category} Specialist • {selectedProviderProfile.serviceAreas ? selectedProviderProfile.serviceAreas.join(', ') : 'Ahmedabad'}</p>

                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
                                    <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <div className="text-xl font-black text-slate-900">{selectedProviderProfile.rating}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Rating</div>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-xl font-black text-slate-900">{selectedProviderProfile.jobs}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Jobs Done</div>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                                        <IndianRupee className="w-5 h-5" />
                                    </div>
                                    <div className="text-xl font-black text-slate-900">{selectedProviderProfile.price.replace('₹', '').replace('/hr', '')}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Rate / Hr</div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="font-bold text-slate-900 text-lg mb-4">Customer Reviews</h3>
                                <div className="space-y-4">
                                    {/* Mock Reviews */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex gap-2 text-amber-400 mb-2">
                                            {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(selectedProviderProfile.rating) ? 'fill-current' : 'text-slate-300'}`} />)}
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
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerHome;
