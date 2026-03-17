
import { useState, useEffect, useMemo, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle, Phone, ShieldCheck, Loader2, Filter, Briefcase, PieChart as PieChartIcon, AlertCircle } from 'lucide-react';
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
    { id: '1', name: 'Plumbing', icon: Droplets, color: 'from-blue-500/10 to-blue-600/5', iconColor: 'text-blue-500' },
    { id: '2', name: 'Electrical', icon: Zap, color: 'from-amber-500/10 to-amber-600/5', iconColor: 'text-amber-500' },
    { id: '3', name: 'Cleaning', icon: Sparkles, color: 'from-emerald-500/10 to-emerald-600/5', iconColor: 'text-emerald-500' },
    { id: '4', name: 'Carpentry', icon: Wrench, color: 'from-orange-500/10 to-orange-600/5', iconColor: 'text-orange-500' },
    { id: '5', name: 'Painting', icon: Sparkles, color: 'from-purple-500/10 to-purple-600/5', iconColor: 'text-purple-500' },
    { id: '6', name: 'AC Repair', icon: Wrench, color: 'from-cyan-500/10 to-cyan-600/5', iconColor: 'text-cyan-500' },
    { id: '7', name: 'Appliance Repair', icon: Zap, color: 'from-rose-500/10 to-rose-600/5', iconColor: 'text-rose-500' },
    { id: '8', name: 'Repair', icon: Wrench, color: 'from-slate-500/10 to-slate-600/5', iconColor: 'text-slate-500' },
    { id: '9', name: 'Pest Control', icon: Sparkles, color: 'from-red-500/10 to-red-600/5', iconColor: 'text-red-500' },
    { id: '10', name: 'Salon & Beauty', icon: Sparkles, color: 'from-pink-500/10 to-pink-600/5', iconColor: 'text-pink-500' },
    { id: '11', name: 'Packers & Movers', icon: Wrench, color: 'from-indigo-500/10 to-indigo-600/5', iconColor: 'text-indigo-500' },
];

import { useNotifications } from '../../context/NotificationContext';

const CustomerHome = () => {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { sendNotification } = useNotifications();

    const [allProviders, setAllProviders] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookingStep, setBookingStep] = useState(0); // 0: lists, 1: form, 2: success
    const [onlineProviders, setOnlineProviders] = useState([]);
    const [activeBookings, setActiveBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [ratingState, setRatingState] = useState({ bookingId: null, rating: 0 });
    const [chartData, setChartData] = useState([]);
    const [sortBy, setSortBy] = useState('rating');

    // New Feature States
    const [ratingFilter, setRatingFilter] = useState('0');
    const [selectedProviderProfile, setSelectedProviderProfile] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingDesc, setBookingDesc] = useState('');
    const [bookingAddress, setBookingAddress] = useState('');
    const [bookingHouseNo, setBookingHouseNo] = useState('');
    const [bookingArea, setBookingArea] = useState('');
    const [bookingLandmark, setBookingLandmark] = useState('');
    const [bookingPincode, setBookingPincode] = useState('');
    const [bookingCity, setBookingCity] = useState('Ahmedabad');
    const [bookingState, setBookingState] = useState('Gujarat');
    const [timeError, setTimeError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(5);
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [dbError, setDbError] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [isLocating, setIsLocating] = useState(false);
    const [locationCoords, setLocationCoords] = useState(null);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [addressSearchTimeout, setAddressSearchTimeout] = useState(null);

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

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
    };

    useEffect(() => {
        setLoadingData(true);

        // 1. Listen to online providers — runs for ALL users (guests AND logged-in)
        const activeOnlineQuery = query(
            collection(db, 'providers')
        );

        const unsubscribeProviders = onSnapshot(activeOnlineQuery, (snapshot) => {
            const allProviders = [];
            snapshot.forEach(d => allProviders.push({ id: d.id, ...d.data() }));

            // Deduplicate by name — prioritize real Auth UID records over mock/pre-filled records
            const uniqueProvidersMap = new Map();
            allProviders.forEach(p => {
                const nameKey = (p.name || '').toLowerCase().trim();
                if (!nameKey) return;
                const existing = uniqueProvidersMap.get(nameKey);
                
                // Identify if this is a "real" Firebase Auth UID (usually 28 chars, no 'dev-' or 'mock-' prefix)
                const isRealId = p.id && p.id.length >= 20 && !p.id.includes('-');
                const isRealUid = p.uid && p.uid.length >= 20 && !p.uid.startsWith('mock-') && !p.uid.includes('-');
                const pIsReal = isRealId || isRealUid;

                const eIsReal = existing && (
                    (existing.id && existing.id.length >= 20 && !existing.id.includes('-')) ||
                    (existing.uid && existing.uid.length >= 20 && !existing.uid.startsWith('mock-') && !existing.uid.includes('-'))
                );

                const pRating = parseFloat(p.rating) || 0;
                const eRating = existing ? (parseFloat(existing.rating) || 0) : 0;
                const pJobs = parseInt(p.jobs) || 0;
                const eJobs = existing ? (parseInt(existing.jobs) || 0) : 0;

                // Priority: 1. Real vs Mock, 2. Rating, 3. Jobs
                if (!existing) {
                    uniqueProvidersMap.set(nameKey, p);
                } else if (pIsReal && !eIsReal) {
                    uniqueProvidersMap.set(nameKey, p);
                } else if (pIsReal === eIsReal) {
                    if (pRating > eRating) {
                        uniqueProvidersMap.set(nameKey, p);
                    } else if (pRating === eRating && pJobs > eJobs) {
                        uniqueProvidersMap.set(nameKey, p);
                    }
                }
            });

            const finalOnlineProviders = Array.from(uniqueProvidersMap.values())
                .filter(p => {
                    const st = (p.status || '').toLowerCase().trim();
                    const isApproved = st === 'active' || st === 'approved';
                    const isOnline = p.isOnline === true || String(p.isOnline) === 'true';
                    return isApproved && isOnline;
                });
            setOnlineProviders(finalOnlineProviders);
            setLoadingData(false);
            setDbError(false);
        }, (err) => {
            console.error('Providers Listener Error:', err);
            setDbError(true);
            setLoadingData(false);
        });

        // 2. Bookings listener — only for logged-in users
        if (!userData?.uid) {
            setOnlineProviders([]);
            setActiveBookings([]);
            setPastBookings([]);
            setChartData([]);
            return () => unsubscribeProviders();
        }

        const myUid = userData.uid;
        const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const allMyBookings = [];
            snapshot.forEach(d => {
                const b = { id: d.id, ...d.data() };
                // Primary: match by UID (new bookings)
                const matchByUid = b.customerUid === myUid;
                // Secondary: match by phone (robust fallback)
                const matchByPhone = b.customerPhone && (b.customerPhone === userData.phone);
                // Fallback: name match ONLY for old bookings (no customerUid stored)
                const matchByName = !b.customerUid && !b.customerPhone && (
                    (b.customer || '').toLowerCase() === (userData.name || '').toLowerCase()
                );
                if (matchByUid || matchByPhone || matchByName) allMyBookings.push(b);
            });

            const sortedAll = allMyBookings.sort((a, b) => {
                const tA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000 || new Date(a.date || 0).getTime();
                const tB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000 || new Date(b.date || 0).getTime();
                return tB - tA;
            });

            setActiveBookings(sortedAll.filter(b => !['completed', 'rejected', 'cancelled'].includes(b.status)));
            const pBookings = sortedAll.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status));
            setPastBookings(pBookings);

            const categoryCounts = {};
            const totalPast = pBookings.length;
            
            pBookings.forEach(b => {
                const cat = b.service || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            
            setChartData(Object.keys(categoryCounts).map(k => ({ 
                name: k, 
                value: categoryCounts[k],
                percentage: totalPast > 0 ? Math.round((categoryCounts[k] / totalPast) * 100) : 0
            })));
        }, (err) => {
            console.error('Bookings Listener Error:', err);
        });

        return () => {
            unsubscribeProviders();
            unsubscribeBookings();
        };
    }, [userData]);

    // Restore pending booking form if returned from login
    useEffect(() => {
        if (userData?.uid && !userData.uid.startsWith('mock-')) {
            const saved = sessionStorage.getItem('pendingCustomerBooking');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    setPendingBookingData(data.pendingBookingData);
                    setBookingDate(data.bookingDate || '');
                    setBookingTime(data.bookingTime || '');
                    setBookingDesc(data.bookingDesc || '');
                    setBookingAddress(data.bookingAddress || '');
                    setBookingHouseNo(data.bookingHouseNo || '');
                    setLocationCoords(data.locationCoords || null);
                    setBookingStep(1); // Jump straight to the form
                } catch (e) {
                    console.error('Failed to parse pending booking', e);
                }
                sessionStorage.removeItem('pendingCustomerBooking');
            }
        }
    }, [userData]);

    const handleAddressTyping = (e) => {
        const val = e.target.value;

        if (addressSearchTimeout) clearTimeout(addressSearchTimeout);

        if (val.trim().length < 3) {
            setAddressSuggestions([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearchingAddress(true);
            try {
                // Nominatim STRUCTURED query — locks city=Ahmedabad & state=Gujarat
                // Much more reliable than free-text + bounded viewbox
                const url = [
                    'https://nominatim.openstreetmap.org/search',
                    `?format=json`,
                    `&street=${encodeURIComponent(val)}`,
                    `&city=Ahmedabad`,
                    `&state=Gujarat`,
                    `&country=India`,
                    `&addressdetails=1`,
                    `&extratags=1`,
                    `&namedetails=1`,
                    `&limit=8`
                ].join('');

                const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
                let data = await res.json();

                // Fallback: if structured query returns nothing, try free-text with city appended
                if (!data || data.length === 0) {
                    const fallbackUrl = [
                        'https://nominatim.openstreetmap.org/search',
                        `?format=json`,
                        `&q=${encodeURIComponent(val + ' Ahmedabad Gujarat')}`,
                        `&addressdetails=1`,
                        `&namedetails=1`,
                        `&countrycodes=in`,
                        `&limit=8`
                    ].join('');
                    const fallbackRes = await fetch(fallbackUrl, { headers: { 'Accept-Language': 'en' } });
                    data = await fallbackRes.json();
                }

                // Keep only Ahmedabad/Gujarat results
                const filtered = (data || []).filter(p => {
                    const addr = JSON.stringify(p.address || {}).toLowerCase();
                    return addr.includes('ahmedabad') || addr.includes('gujarat');
                });

                setAddressSuggestions(filtered);
            } catch (err) {
                console.error('Nominatim search failed', err);
            } finally {
                setIsSearchingAddress(false);
            }
        }, 500);
        setAddressSearchTimeout(timeoutId);
    };

    const handleSelectSuggestion = (place) => {
        const a = place.address || {};
        const name = place.namedetails?.name || place.name || '';
        const area = [
            name,
            a.road || a.pedestrian || '',
            a.suburb || a.neighbourhood || a.quarter || ''
        ].filter(Boolean).join(', ');
        setBookingArea(area || '');
        setBookingPincode(a.postcode || '');
        setBookingCity(a.city || a.town || 'Ahmedabad');
        setBookingState(a.state || 'Gujarat');
        setBookingAddress(area);
        setLocationCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
        setAddressSuggestions([]);
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLocationCoords({ lat, lng });
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    const data = await response.json();
                    if (data && data.address) {
                        const a = data.address;
                        const area = [
                            a.road || a.pedestrian || a.footway || '',
                            a.suburb || a.neighbourhood || a.quarter || a.village || ''
                        ].filter(Boolean).join(', ');
                        setBookingArea(area || a.county || '');
                        setBookingPincode(a.postcode || '');
                        setBookingCity(a.city || a.town || a.municipality || 'Ahmedabad');
                        setBookingState(a.state || 'Gujarat');
                        setBookingAddress(area || data.display_name);
                    }
                } catch (error) {
                    console.error('Geocoding error:', error);
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                console.error('Location error:', error);
                setIsLocating(false);
                if (error.code === 1) alert('Location access denied. Please allow location permissions.');
                else alert('Unable to retrieve your location.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

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
            // Prioritize the ID if it looks like a real Auth UID, otherwise use .uid field
            providerUid: (provider.id && provider.id.length >= 20 && !provider.id.includes('-')) 
                ? provider.id 
                : (provider.uid && !provider.uid.startsWith('mock-') ? provider.uid : provider.id),
            providerPhone: provider.phone || '',
            previousWorkSample: provider.previousWorkSample,
            portfolio: provider.portfolio || [],
            customer: userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer'),
            price: parsedPrice
        };

        setPendingBookingData(newBooking);
        // Also store customer phone so provider can call
        newBooking.customerPhone = userData?.phone || '';
        setBookingDate('');
        setBookingTime('');
        setBookingDesc('');
        setBookingDate('');
        setBookingTime('');
        setBookingDesc('');
        setBookingAddress('');
        setBookingHouseNo('');
        setBookingArea('');
        setBookingLandmark('');
        setBookingPincode('');
        setBookingCity('Ahmedabad');
        setBookingState('Gujarat');
        setTimeError('');
        setSelectedProviderProfile(null);
        setBookingStep(1);
    };

    const confirmBooking = async (e) => {
        e.preventDefault();

        // If guest user clicks "Confirm Request", save their details and send them to login
        if (!userData || !userData.uid || userData.uid === 'mock-cust') {
            sessionStorage.setItem('pendingCustomerBooking', JSON.stringify({
                pendingBookingData,
                bookingDate,
                bookingTime,
                bookingDesc,
                bookingAddress,
                bookingHouseNo,
                bookingArea,
                bookingLandmark,
                bookingPincode,
                bookingCity,
                bookingState,
                locationCoords
            }));
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

        const fullAddress = [
            bookingHouseNo,
            bookingArea || bookingAddress,
            bookingLandmark ? `Near ${bookingLandmark}` : '',
            bookingPincode,
            bookingCity || 'Ahmedabad',
            bookingState || 'Gujarat'
        ].filter(Boolean).join(', ');

        const finalBookingData = {
            service: pendingBookingData ? pendingBookingData.service : (selectedCategory || 'Plumbing'),
            status: 'pending',
            provider: pendingBookingData.provider,
            providerUid: pendingBookingData.providerUid || '',
            providerPhone: pendingBookingData.providerPhone || '',
            customer: userData?.name || 'Customer',
            customerUid: userData?.uid || '',
            customerPhone: pendingBookingData.customerPhone || userData?.phone || '',
            price: parseInt(pendingBookingData.price) || 500,
            date: bookingDate,
            time: bookingTime,
            description: bookingDesc,
            address: fullAddress,
            houseNo: bookingHouseNo,
            area: bookingArea,
            landmark: bookingLandmark,
            pincode: bookingPincode,
            city: bookingCity || 'Ahmedabad',
            state: bookingState || 'Gujarat',
            location: locationCoords ? { lat: locationCoords.lat, lng: locationCoords.lng } : null,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'bookings'), finalBookingData);
            
            // Notify Admin
            sendNotification('admin', 'New Booking Received', `${userData.name} booked ${finalBookingData.service} for ${finalBookingData.date}.`, 'booking');

            // Notify Provider
            if (finalBookingData.providerUid) {
                sendNotification(finalBookingData.providerUid, 'New Job Request', `${userData.name} has requested your ${finalBookingData.service} service for ${finalBookingData.date}.`, 'info');
            }

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
            setActiveBookings(prev => prev.filter(b => b.id !== bookingId));
        } catch (err) {
            console.error('Cancel error:', err);
        }
    };

    // Unified Filtering & Sorting Logic — Memoized for performance
    const displayedProviders = useMemo(() => {
        return onlineProviders.filter(p => {
            // 1. Status Check — accept 'active' OR 'approved'
            const providerStatus = (p.status || '').toLowerCase().trim();
            if (providerStatus !== 'active' && providerStatus !== 'approved') return false;

            const pName = (p.name || '').toLowerCase();
            const pCats = (Array.isArray(p.category) ? p.category : [p.category || '']).map(c => String(c).toLowerCase().trim());
            const queryTerm = (searchQuery || '').toLowerCase().trim();

            // 2. Global Search Override
            if (queryTerm !== '') {
                const matchesSearch = pName.includes(queryTerm) || pCats.some(c => c.includes(queryTerm));
                if (!matchesSearch) return false;
            }

            // 3. Category Filter (Now works alongside search)
            if (selectedCategory && selectedCategory !== 'All') {
                const target = selectedCategory.toLowerCase().trim();
                const matchesCategory = pCats.some(c => {
                    if (c === target) return true;
                    if (target === 'carpentry' && (c.includes('carpent') || c.includes('wood'))) return true;
                    if (target === 'electrical' && (c.includes('electri') || c.includes('light'))) return true;
                    if (target === 'plumbing' && (c.includes('plumb') || c.includes('pipe'))) return true;
                    if (target === 'cleaning' && (c.includes('clean') || c.includes('housekeep'))) return true;
                    return c.includes(target) || target.includes(c);
                });
                if (!matchesCategory) return false;
            }

            // 4. Rating Filter
            if (ratingFilter !== '0') {
                const minRating = parseFloat(ratingFilter);
                if ((parseFloat(p.rating) || 0) < minRating) return false;
            }

            return true;
        }).sort((a, b) => {
            const parsePrice = (val) => {
                if (typeof val === 'number') return val;
                return parseInt((val || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 500;
            };
            const parseJobs = (val) => {
                if (typeof val === 'number') return val;
                return parseInt((val || '').toString().replace(/[^0-9]/g, '')) || 0;
            };

            if (sortBy === 'rating') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
            if (sortBy === 'jobs') return parseJobs(b.jobs || b.jobCount) - parseJobs(a.jobs || a.jobCount);
            if (sortBy === 'priceLow') return parsePrice(a.price) - parsePrice(b.price);
            if (sortBy === 'priceHigh') return parsePrice(b.price) - parsePrice(a.price);
            return 0;
        });
    }, [onlineProviders, searchQuery, selectedCategory, ratingFilter, sortBy]);

    const handleActivityClick = (booking) => {
        // Removed intrusive alert popup that caused confusion about changing status
    };

    const handleNegotiation = async (id, accept, proposedPrice) => {
        try {
            if (accept) {
                await updateDoc(doc(db, 'bookings', id), { status: 'accepted', price: proposedPrice });
                setActiveBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted', price: proposedPrice } : b));
            } else {
                await updateDoc(doc(db, 'bookings', id), { status: 'rejected' });
                setActiveBookings(prev => prev.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitRating = async (booking) => {
        if (ratingState.rating > 0) {
            try {
                // Find Provider doc — Prioritize providerUid if stored in booking, fallback to name
                let providerId = null;
                if (booking.providerUid) {
                    providerId = booking.providerUid;
                } else {
                    const q = query(collection(db, 'providers'), where('name', '==', booking.provider));
                    const snap = await getDocs(q);
                    if (!snap.empty) providerId = snap.docs[0].id;
                }

                if (providerId) {
                    // Try to get by ID directly
                    try {
                        const pRef = doc(db, 'providers', providerId);
                        const pDoc = await getDocs(query(collection(db, 'providers'), where('__name__', '==', providerId)));
                        if (!pDoc.empty) {
                            const p = pDoc.docs[0].data();
                            // Correct Rating Math: Use ratingCount specifically for average calculation
                            const currentRating = parseFloat(p.rating) || 0;
                            const ratingCount = parseInt(p.ratingCount) || 0;
                            
                            let newRating;
                            if (ratingCount === 0) {
                                newRating = ratingState.rating;
                            } else {
                                newRating = ((currentRating * ratingCount) + ratingState.rating) / (ratingCount + 1);
                            }

                            await updateDoc(doc(db, 'providers', pDoc.docs[0].id), { 
                                rating: parseFloat(newRating.toFixed(1)),
                                ratingCount: ratingCount + 1
                            });
                        }
                    } catch (e) { console.error('Rating update failed:', e); }
                }

                await updateDoc(doc(db, 'bookings', booking.id), { rated: true, ratingGiven: ratingState.rating });
                setRatingState({ bookingId: null, rating: 0 });
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 animate-fade-in">
            {/* Hero Section / Welcome Header */}
            <div className={`mb-16 relative overflow-hidden rounded-[3.5rem] ${!userData?.uid ? 'bg-surface-900 border border-white/5 p-10 md:p-24 shadow-2xl' : 'bg-linear-to-br from-primary/5 via-transparent to-transparent p-12'}`}>
                <div className="absolute top-0 right-10 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-light/10 rounded-full blur-[100px] pointer-events-none animate-float"></div>

                {!userData?.uid && (
                    <div className="absolute inset-0 z-0">
                        {serviceImages.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt="Service"
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ease-in-out ${idx === currentImageIndex ? 'opacity-40' : 'opacity-0'}`}
                            />
                        ))}
                        <div className="absolute inset-0 mesh-gradient opacity-60 mix-blend-multiply"></div>
                        <div className="absolute inset-0 bg-linear-to-r from-surface-900 via-surface-900/60 to-transparent"></div>
                    </div>
                )}

                <div className="relative z-10 max-w-3xl">
                    <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8 shadow-sm backdrop-blur-md border ${!userData?.uid ? 'bg-white/5 border-white/10' : 'bg-surface-100 border-surface-200'}`}>
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${!userData?.uid ? 'text-white' : 'text-slate-600'}`}>Verified Professionals in Ahmedabad</span>
                    </div>

                    <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] mb-6 ${!userData?.uid ? 'text-white' : 'text-slate-950'}`}>
                        {!userData?.uid ? (
                            <>
                                Premium <br />
                                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-light to-blue-400">
                                    Home Services
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="block text-slate-500 text-lg md:text-xl font-bold tracking-tight mb-2">Welcome Back,</span>
                                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-indigo-600 to-indigo-800">
                                    {userData.name || 'Prime User'}
                                </span>
                            </>
                        )}
                    </h1>

                    {!userData?.uid ? (
                        <div className="space-y-8">
                            <p className="text-lg md:text-2xl font-medium text-white/50 leading-relaxed max-w-xl">
                                Book world-class professionals for your home essentials. Experience reliability at your doorstep.
                            </p>
                            <div className="flex flex-wrap gap-6 pt-4">
                                <button onClick={() => navigate('/login')} className="px-10 py-5 bg-primary hover:bg-primary-dark text-white font-black rounded-3xl shadow-2xl shadow-primary/30 transition-all hover-lift active:scale-95">
                                    Get Started
                                </button>
                                <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} className="px-10 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-2xl text-white font-black rounded-3xl border border-white/10 transition-all hover-lift">
                                    Browse Catalog
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-lg md:text-xl font-bold text-slate-400 mt-4 tracking-tight">What can we help you with today?</p>
                    )}
                </div>
            </div>

            {bookingStep === 1 ? (
                <div className="max-w-3xl glass-card rounded-[3rem] shadow-2xl border-white/10 mx-auto relative overflow-hidden animate-fade-in">
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary to-primary-light"></div>
                    <div className="p-10 md:p-14">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h2 className="text-4xl font-black text-surface-900 tracking-tighter">Confirm Booking</h2>
                                {pendingBookingData?.service && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mt-3">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        <span className="text-primary font-black text-[10px] uppercase tracking-widest">{pendingBookingData.service}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setBookingStep(0)}
                                className="p-3 bg-surface-100 hover:bg-surface-200 text-surface-400 rounded-2xl transition-all hover:rotate-90 duration-300"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {pendingBookingData && (pendingBookingData.previousWorkSample || (pendingBookingData.portfolio && pendingBookingData.portfolio.length > 0)) && (
                            <div className="mb-12">
                                <label className="block text-[10px] font-black text-surface-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Portfolio & Verification
                                </label>
                                <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar snap-x">
                                    {pendingBookingData.portfolio && pendingBookingData.portfolio.length > 0 ? (
                                        pendingBookingData.portfolio.map((img, idx) => (
                                            <div key={idx} className="rounded-3xl overflow-hidden h-40 w-64 border border-surface-100 shadow-lg relative group shrink-0 snap-center">
                                                <img
                                                    src={img}
                                                    alt={`Work sample ${idx + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&q=80';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-surface-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">View Project</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-3xl overflow-hidden h-48 w-full border border-surface-100 shadow-lg relative group">
                                            <img
                                                src={pendingBookingData.previousWorkSample || 'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&q=80'}
                                                alt="Previous Work Sample"
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&q=80';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <form onSubmit={confirmBooking} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Service Date</label>
                                    <div className="relative group">
                                        <Calendar className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            required
                                            type="date"
                                            value={bookingDate}
                                            min={getTodayStr()}
                                            onChange={(e) => { setBookingDate(e.target.value); setBookingTime(''); }}
                                            className="w-full pl-14 pr-5 py-5 bg-surface-50 border border-surface-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-surface-900 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Preferred Time</label>
                                    <div className="relative group">
                                        <ClockIcon className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            required
                                            type="time"
                                            value={bookingTime}
                                            min={bookingDate === getTodayStr() ? getNowTimeStr() : undefined}
                                            onChange={(e) => {
                                                const selected = e.target.value;
                                                if (bookingDate === getTodayStr() && selected && selected <= getNowTimeStr()) {
                                                    setTimeError(`Please pick a time after ${getNowTimeStr()} for today.`);
                                                    setBookingTime('');
                                                } else {
                                                    setTimeError('');
                                                    setBookingTime(selected);
                                                }
                                            }}
                                            className={`w-full pl-14 pr-5 py-5 bg-surface-50 border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-surface-900 outline-none ${timeError ? 'border-red-400' : 'border-surface-200'}`}
                                        />
                                    </div>
                                    {timeError && (
                                        <p className="text-red-500 text-[10px] font-black mt-2 flex items-center gap-1 uppercase tracking-widest">
                                            <AlertCircle className="w-3 h-3" /> {timeError}
                                        </p>
                                    )}
                                </div>
                            </div>

                        {/* Amazon-style structured address form */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Service Address *</label>
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    disabled={isLocating}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                                    {isLocating ? 'Detecting...' : 'Use My Location'}
                                </button>
                            </div>

                            {/* Row 1: Flat / House No */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Flat, House No., Building, Company, Apartment *</label>
                                <input
                                    required
                                    type="text"
                                    value={bookingHouseNo}
                                    onChange={(e) => setBookingHouseNo(e.target.value)}
                                    placeholder="e.g. 110, Amaltas Apartment"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                />
                            </div>

                            {/* Row 2: Area / Street with autocomplete */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Area, Street, Sector, Village *</label>
                                <input
                                    required
                                    type="text"
                                    value={bookingArea}
                                    onChange={(e) => { setBookingArea(e.target.value); handleAddressTyping(e); }}
                                    placeholder="e.g. ISKCON Flyover, Vastrapur"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                />
                                {isSearchingAddress && (
                                    <div className="absolute right-4 top-11">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    </div>
                                )}
                                {addressSuggestions.length > 0 && (
                                    <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-2xl mt-1 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                                        {addressSuggestions.map((place, i) => {
                                            const a = place.address || {};
                                            const name = place.namedetails?.name || place.name || '';
                                            const locality = a.suburb || a.neighbourhood || a.quarter || a.road || '';
                                            const placeType = (place.type || place.class || '').replace(/_/g, ' ');
                                            const isLandmark = !['residential', 'yes', 'house'].includes(place.type);
                                            return (
                                                <li key={i}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectSuggestion(place)}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-bold text-slate-800 truncate">{name || locality || 'Ahmedabad'}</span>
                                                                    {isLandmark && placeType && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wide shrink-0">{placeType}</span>
                                                                    )}
                                                                </div>
                                                                {locality && name && <p className="text-xs text-slate-400 mt-0.5 truncate">{locality}, Ahmedabad</p>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* Row 3: Landmark */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Landmark (Optional)</label>
                                <input
                                    type="text"
                                    value={bookingLandmark}
                                    onChange={(e) => setBookingLandmark(e.target.value)}
                                    placeholder="E.g. Near Apollo Hospital"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                />
                            </div>

                            {/* Row 4: Pincode + City */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Pincode</label>
                                    <input
                                        type="text"
                                        value={bookingPincode}
                                        onChange={(e) => setBookingPincode(e.target.value)}
                                        placeholder="380015"
                                        maxLength={6}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Town / City</label>
                                    <input
                                        type="text"
                                        value={bookingCity}
                                        readOnly
                                        className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Row 5: State */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">State</label>
                                <input
                                    type="text"
                                    value={bookingState}
                                    readOnly
                                    className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Issue Description *</label>
                            <textarea 
                                required
                                value={bookingDesc} 
                                onChange={(e) => setBookingDesc(e.target.value)} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 min-h-[100px]" 
                                placeholder="Please describe the issue in detail (e.g., Fan regulator is not working, sparking in switch)" 
                            />
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-16">
                        {/* Improved Premium Search */}
                        <div className="relative group max-w-4xl">
                            <div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-primary-light/10 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
                            <div className="relative flex items-center bg-white border border-surface-100 rounded-[2rem] shadow-2xl shadow-primary/5 overflow-hidden transition-all duration-500 focus-within:ring-1 focus-within:ring-primary/20">
                                <div className="pl-8 flex items-center">
                                    <Search className="w-6 h-6 text-surface-300 group-focus-within:text-primary transition-colors duration-300" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for 'Plumbing', 'Electrician', etc."
                                    className="w-full px-6 py-7 bg-transparent border-none focus:ring-0 text-xl font-semibold text-surface-900 placeholder:text-surface-300"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="pr-8 text-surface-300 hover:text-surface-500 transition-colors"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-8">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-2">Service Catalog</p>
                                    <h2 className="text-4xl font-black text-surface-900 tracking-tighter">Featured Services</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setSelectedCategory(null)}
                                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-50 text-surface-400 hover:bg-surface-100'}`}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                                        className={`group relative flex flex-col items-center p-8 rounded-[2.5rem] transition-all duration-500 hover-lift ${selectedCategory === cat.name ? 'ring-2 ring-primary bg-white shadow-2xl scale-105' : 'bg-linear-to-br border border-white/40 shadow-sm'} ${cat.color}`}
                                    >
                                        <div className={`w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ${cat.iconColor}`}>
                                            <cat.icon className="w-8 h-8" />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest text-center ${selectedCategory === cat.name ? 'text-primary' : 'text-surface-600'}`}>{cat.name}</span>
                                        
                                        {selectedCategory === cat.name && (
                                            <div className="absolute top-4 right-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Providers with Filters */}
                        <div className="space-y-10">
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.2em]">Live Status</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-surface-900 tracking-tighter">
                                        {selectedCategory ? `${selectedCategory} Experts` : 'Available Experts'}
                                    </h2>
                                    <p className="text-sm font-bold text-surface-400 mt-2">{displayedProviders.length} Professionals available in your area</p>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Rating Filter UI */}
                                    <div className="flex items-center gap-2 bg-surface-50 pl-3.5 pr-1 py-2 rounded-2xl border border-surface-200">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                                        <select
                                            value={ratingFilter}
                                            onChange={(e) => setRatingFilter(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-[0.15em] text-surface-600 outline-none pr-7 cursor-pointer"
                                        >
                                            <option value="0">All Ratings</option>
                                            <option value="4">4.0+ Stars</option>
                                            <option value="4.5">4.5+ Stars</option>
                                            <option value="4.8">4.8+ Stars</option>
                                        </select>
                                    </div>

                                    {/* Sort Dropdown */}
                                    <div className="flex items-center gap-2 bg-surface-50 pl-3.5 pr-1 py-2 rounded-2xl border border-surface-200">
                                        <Filter className="w-3.5 h-3.5 text-surface-400" />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-[0.15em] text-surface-600 outline-none pr-7 cursor-pointer"
                                        >
                                            <option value="rating">Top Rated</option>
                                            <option value="jobs">Most Experienced</option>
                                            <option value="priceLow">Price: Low to High</option>
                                            <option value="priceHigh">Price: High to Low</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {displayedProviders.length > 0 ? (
                                    displayedProviders.map((p) => {
                                        const ratingValue = parseFloat(p.rating || 0).toFixed(1);
                                        const jobCount = p.jobs || p.jobCount || 0;
                                        const nameInitial = (p.name || 'P').charAt(0).toUpperCase();
                                        const category = (Array.isArray(p.category) ? p.category[0] : p.category) || 'General';

                                        return (
                                            <div key={p.id} className="group relative bg-white rounded-[2.5rem] border border-slate-200 hover:border-primary/40 shadow-sm transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] overflow-hidden">
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="relative">
                                                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-black text-primary border border-slate-200 transition-all duration-500 group-hover:scale-105 group-hover:border-primary/20">
                                                                    {nameInitial}
                                                                </div>
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-white shadow-lg"></div>
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight group-hover:text-primary transition-colors">{p.name || 'Professional'}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-black text-primary/80 uppercase tracking-widest">{category}</span>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="w-3 h-3 text-amber-500 fill-current" />
                                                                        <span className="text-[10px] font-black text-slate-900">{ratingValue !== '0.0' ? ratingValue : 'New'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end whitespace-nowrap">
                                                            <div className="flex items-baseline gap-0.5">
                                                                <span className="text-xs font-black text-slate-950">₹</span>
                                                                <span className="text-xl font-black text-slate-950 tracking-tighter">{p.price || 499}</span>
                                                                <span className="text-slate-400 text-[9px] font-bold">/hr</span>
                                                            </div>
                                                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Starting Rate</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 mb-6 border-t border-slate-50 pt-6">
                                                        <div className="flex-1">
                                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Total Jobs</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <Briefcase className="w-3 h-3 text-primary/50" />
                                                                <span className="text-[11px] font-black text-slate-900 leading-none">{jobCount}+</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-6 w-px bg-slate-100"></div>
                                                        <div className="flex-1">
                                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Identity</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <ShieldCheck className="w-3 h-3 text-emerald-500/50" />
                                                                <span className="text-[11px] font-black text-slate-900 leading-none">Verified</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-6 w-px bg-slate-100"></div>
                                                        <div className="flex-[1.2] min-w-0">
                                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Location</p>
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-2.5 h-2.5 text-slate-200" />
                                                                <span className="text-[10px] font-bold text-slate-500 truncate leading-none">Ahmedabad</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2.5">
                                                        <button 
                                                            onClick={() => setSelectedProviderProfile(p)}
                                                            className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest border border-slate-100"
                                                        >
                                                            Profile
                                                        </button>
                                                        <button 
                                                            onClick={() => handleBook(p)}
                                                            className="flex-[2] py-3.5 bg-primary hover:bg-primary-dark text-white font-black rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98] text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                                        >
                                                            Instant Booking <Wrench className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-1 md:col-span-2 py-20 bg-surface-50 rounded-[3rem] border-2 border-dashed border-surface-200 text-center">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                            <Search className="w-8 h-8 text-surface-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-surface-900 mb-2">No professionals found</h3>
                                        <p className="text-surface-400 font-medium">Try adjusting your search or filters to see more results.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Active Bookings */}
                    <div className="space-y-8">
                        {/* Current Activity Box */}
                        <div className="bg-surface-900 p-1 rounded-[3.5rem] shadow-2xl shadow-primary/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-colors duration-700"></div>
                            <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[3.3rem] min-h-[450px] flex flex-col border border-white/5">
                                {userData?.uid ? (
                                    <>
                                        <div className="flex items-center justify-between mb-10">
                                            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                                                <div className="w-1.5 h-8 bg-primary rounded-full"></div>
                                                Live Activity
                                            </h2>
                                            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10">
                                                <span className="text-white/60 font-black text-[9px] uppercase tracking-widest">{activeBookings.length} Active</span>
                                            </div>
                                        </div>

                                        <div className="space-y-6 relative z-10 flex-1 overflow-y-auto pr-2 hide-scrollbar">
                                            {activeBookings.length > 0 ? (
                                                activeBookings.map(b => (
                                                    <div key={b.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl transition-all relative overflow-hidden group/card hover:bg-white/[0.08]">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full transition-all ${['negotiating', 'negotiation'].includes(b.status) ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-primary shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}></div>
                                                        <div className="flex flex-col gap-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0 ${
                                                                        ['negotiating', 'negotiation'].includes(b.status) ? 'bg-amber-400/20' : 
                                                                        b.trackingStatus === 'inprogress' ? 'bg-emerald-400/20' : 
                                                                        b.trackingStatus ? 'bg-blue-400/20' : 'bg-primary/20'
                                                                    }`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                                            ['negotiating', 'negotiation'].includes(b.status) ? 'bg-amber-400' : 
                                                                            b.trackingStatus === 'inprogress' ? 'bg-emerald-400' : 
                                                                            b.trackingStatus ? 'bg-blue-400' : 'bg-primary'
                                                                        }`}></div>
                                                                        <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                                                                            ['negotiating', 'negotiation'].includes(b.status) ? 'text-amber-400' : 
                                                                            b.trackingStatus === 'inprogress' ? 'text-emerald-400' : 
                                                                            b.trackingStatus ? 'text-blue-400' : 'text-primary'
                                                                        }`}>
                                                                            {b.status === 'negotiating' ? 'Action Needed' : 
                                                                             b.trackingStatus === 'inprogress' ? 'In Progress' : 
                                                                             b.trackingStatus === 'enroute' ? 'On The Way' : 
                                                                             b.trackingStatus === 'arrived' ? 'Arrived' : 
                                                                             b.status}
                                                                        </span>
                                                                    </div>
                                                                    {b.price && <span className="font-black text-white/90 text-lg">₹{b.price}</span>}
                                                                </div>
                                                                <h4 className="font-black text-white tracking-tight text-xl leading-none pt-1 group-hover/card:text-primary transition-colors">{b.service}</h4>
                                                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                                                    {b.provider || 'Professional'}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center justify-between py-3 border-y border-white/5">
                                                                <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
                                                                    <ClockIcon className="w-3.5 h-3.5 opacity-70" /> 
                                                                    <span>{b.date} • {formatTime(b.time)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Negotiation Controls */}
                                                            {['negotiating', 'negotiation'].includes(b.status) && b.proposedPrice && (
                                                                <div className="mt-4 pt-4 border-t border-white/5 bg-white/5 -mx-6 -mb-6 p-6">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">New Quote Given</span>
                                                                        <span className="text-xl font-black text-white tracking-tighter">₹{b.proposedPrice}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => handleNegotiation(b.id, true, b.proposedPrice)}
                                                                            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                                                        >
                                                                            Accept
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleNegotiation(b.id, false)}
                                                                            className="flex-1 py-3 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/60 font-black rounded-xl text-[10px] uppercase tracking-widest border border-white/5 transition-all"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                                                        <ClockIcon className="w-10 h-10 text-white/10" />
                                                    </div>
                                                    <p className="text-white/40 font-bold text-sm">No active requests found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <div className="relative w-56 h-56 mb-10 group">
                                            <div className="absolute inset-0 bg-primary/20 rounded-[3.5rem] rotate-6 group-hover:rotate-0 transition-transform duration-700 blur shadow-2xl"></div>
                                            <div className="relative h-full w-full rounded-[3.5rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                                                {serviceImages.map((img, idx) => (
                                                    <img key={idx} src={img} alt="Service Pro" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`} />
                                                ))}
                                                <div className="absolute inset-0 bg-linear-to-t from-surface-900/80 to-transparent"></div>
                                            </div>
                                        </div>
                                        <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">Prime Quality</h3>
                                        <p className="text-white/50 text-sm font-medium leading-relaxed mb-10 px-4 italic">Experience the benchmark of home services. Reliable, professional, and at your doorstep.</p>
                                        <button onClick={() => navigate('/login')} className="w-full py-5 bg-white text-surface-900 font-black rounded-[2rem] shadow-2xl hover:bg-primary hover:text-white transition-all text-[11px] uppercase tracking-[0.2em]">
                                            Sign In to Start
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent History Box */}
                        <div className="glass-card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-white/10 shadow-2xl shadow-primary/5">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-surface-900 tracking-tighter">Recent Jobs</h2>
                                <span className="bg-surface-50 text-surface-400 text-[10px] px-3 py-1 rounded-full font-black border border-surface-100">{pastBookings.length}</span>
                            </div>
                            <div className="space-y-6">
                                {pastBookings.length > 0 ? (
                                    <>
                                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 md:pr-2 hide-scrollbar">
                                            {pastBookings.slice(0, visibleHistoryCount).map(b => (
                                                <div key={b.id} className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-surface-50/50 border border-surface-100 hover:border-primary/20 transition-all flex flex-col gap-4 md:gap-5 group">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <p className="font-black text-surface-900 uppercase text-[10px] tracking-widest truncate">{b.service}</p>
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-500'}`}>
                                                                    {b.status}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-xs font-black text-surface-900">{b.provider || 'Professional'}</h4>
                                                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">{b.date || 'N/A'}</p>
                                                        </div>
                                                        <p className="font-black text-surface-900 shrink-0 text-sm">₹{(b.proposedPrice || b.price || 0).toFixed(0)}</p>
                                                    </div>

                                                    {/* Interactive Rating for Completed Jobs */}
                                                    {b.status === 'completed' && !b.rated && (
                                                        <div className="pt-4 border-t border-surface-100">
                                                                    <div className="flex flex-col items-center w-full gap-4">
                                                                        <div className="flex gap-0.5 justify-center flex-nowrap shrink-0">
                                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                                <button
                                                                                    key={star}
                                                                                    onClick={() => setRatingState({ bookingId: b.id, rating: star })}
                                                                                    className="transition-transform active:scale-95 p-1"
                                                                                >
                                                                                    <Star className={`w-[19px] h-[19px] ${star <= (ratingState.bookingId === b.id ? ratingState.rating : 0) ? 'text-amber-500 fill-current' : 'text-slate-200'}`} />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    {ratingState.bookingId === b.id && ratingState.rating > 0 && (
                                                                        <button
                                                                            onClick={() => submitRating(b)}
                                                                            className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] shadow-lg shadow-primary/20 transition-all active:scale-[0.97]"
                                                                        >
                                                                            Submit Rating
                                                                        </button>
                                                                    )}
                                                                </div>
                                                        </div>
                                                    )}

                                                    {/* Show Rating if already rated */}
                                                    {b.rated && b.ratingGiven && (
                                                        <div className="pt-4 border-t border-surface-100 flex items-center gap-1.5">
                                                            <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest">You Rated:</span>
                                                            <div className="flex gap-0.5">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} className={`w-3 h-3 ${i < b.ratingGiven ? 'text-amber-500 fill-current' : 'text-surface-100'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {visibleHistoryCount < pastBookings.length && (
                                            <button 
                                                onClick={() => setVisibleHistoryCount(prev => prev + 5)}
                                                className="w-full py-4 border-2 border-dashed border-surface-200 rounded-3xl text-surface-400 font-black hover:border-primary hover:text-primary transition-all text-[10px] uppercase tracking-widest"
                                            >
                                                Load More
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="py-12 text-center">
                                        <ClockIcon className="w-10 h-10 mx-auto mb-4 text-surface-200 opacity-20" />
                                        <p className="text-[11px] font-black text-surface-400 uppercase tracking-widest">No history yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Service Breakdown Chart */}
                        {userData?.uid && chartData.length > 0 && (
                            <div className="glass-card p-10 rounded-[3.5rem] border-white/10 shadow-2xl shadow-primary/5">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <PieChartIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-black text-surface-900 tracking-tighter">
                                        Service Mix
                                    </h2>
                                </div>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                                {chartData.map((entry, index) => {
                                                    const COLORS = ['#2563eb', '#3b82f6', '#1d4ed8', '#1e40af', '#60a5fa'];
                                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" />;
                                                })}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ 
                                                    borderRadius: '24px', 
                                                    border: 'none', 
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                    background: 'rgba(15, 23, 42, 0.95)',
                                                    backdropFilter: 'blur(10px)',
                                                    color: 'white',
                                                    padding: '12px 16px'
                                                }} 
                                                itemStyle={{ color: 'white', fontWeight: 'bold' }}
                                                formatter={(value, name, props) => [`${value} Jobs (${props.payload.percentage}%)`, name]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 flex flex-col gap-3">
                                    {chartData.map((entry, index) => (
                                        <div key={index} className="flex items-center justify-between px-4 py-2 bg-surface-50 rounded-2xl border border-surface-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: ['#2563eb', '#3b82f6', '#1d4ed8', '#1e40af', '#60a5fa'][index % 5] }}></div>
                                                <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">{entry.name}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{entry.value} ({entry.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Provider Detail Modal — Premium Glassmorphism Design */}
            {
                selectedProviderProfile && (() => {
                    const p = selectedProviderProfile;
                    const name = String(p.name || 'Service Specialist');
                    const initial = name.charAt(0).toUpperCase();
                    const category = Array.isArray(p.category) ? String(p.category[0] || 'General') : String(p.category || 'General specialist');
                    const ratingValue = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || 0);
                    const jobs = String(p.jobs || p.jobCount || '0');
                    const areas = Array.isArray(p.serviceAreas) ? String(p.serviceAreas[0] || 'Ahmedabad') : String(p.serviceAreas || 'Ahmedabad');
                    const price = String(p.price || '499');

                    return (
                        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-6 sm:p-8 animate-fade-in" onClick={() => setSelectedProviderProfile(null)}>
                            <div className="bg-white/80 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col border border-white/20" onClick={e => e.stopPropagation()}>
                                <div className="h-48 bg-linear-to-br from-primary via-indigo-600 to-indigo-700 relative shrink-0">
                                    <div className="absolute inset-0 bg-mesh opacity-30"></div>
                                    <button onClick={() => setSelectedProviderProfile(null)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full p-3 backdrop-blur-lg border border-white/10">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                
                                <div className="px-10 pb-10 -mt-16 relative flex-1 overflow-y-auto hide-scrollbar">
                                    <div className="flex justify-between items-end mb-8">
                                        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-5xl font-black text-primary border-8 border-white shadow-2xl shadow-primary/20 rotate-1 group-hover:rotate-0 transition-transform">
                                            {initial}
                                        </div>
                                        <div className="flex flex-col gap-3 items-end mb-2">
                                            <button
                                                onClick={(e) => {
                                                    if (!userData?.uid) { navigate('/login'); return; }
                                                    if (!p.phone) { alert('Contact details unavailable.'); return; }
                                                    window.location.href = `tel:${p.phone}`;
                                                }}
                                                className="px-8 py-3 bg-emerald-50 text-emerald-600 font-black rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
                                            >
                                                <Phone className="w-4 h-4" /> Direct Call
                                            </button>
                                            <button onClick={() => handleBook(p)} className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest">
                                                Confirm Booking
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black text-surface-900 tracking-tighter">{name}</h2>
                                        <p className="text-sm font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2">
                                            {category} Specialist <span className="w-1 h-1 rounded-full bg-surface-200"></span> {areas}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 mt-10">
                                        <div className="bg-surface-50 rounded-[2rem] p-6 text-center border border-surface-100/50">
                                            <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-2">
                                                <Star className="w-5 h-5 fill-current" />
                                            </div>
                                            <div className="text-2xl font-black text-surface-900">{ratingValue > 0 ? ratingValue.toFixed(1) : 'New'}</div>
                                            <div className="text-[9px] font-black text-surface-400 uppercase tracking-widest mt-1">Provider Rating</div>
                                        </div>
                                        <div className="bg-surface-50 rounded-[2rem] p-6 text-center border border-surface-100/50">
                                            <div className="flex items-center justify-center gap-1.5 text-primary mb-2">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <div className="text-2xl font-black text-surface-900">{jobs}</div>
                                            <div className="text-[9px] font-black text-surface-400 uppercase tracking-widest mt-1">Jobs Completed</div>
                                        </div>
                                        <div className="bg-surface-50 rounded-[2rem] p-6 text-center border border-surface-100/50">
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-500 mb-2">
                                                <IndianRupee className="w-5 h-5" />
                                            </div>
                                            <div className="text-2xl font-black text-surface-900">₹{price}</div>
                                            <div className="text-[9px] font-black text-surface-400 uppercase tracking-widest mt-1">Starting Rate</div>
                                        </div>
                                    </div>

                                    {/* Portfolio Section */}
                                    <div className="mt-12">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Work Showcase</p>
                                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                            {p.portfolio && p.portfolio.length > 0 ? (
                                                p.portfolio.map((img, idx) => (
                                                    <div key={idx} className="w-64 h-40 rounded-[2rem] overflow-hidden shrink-0 snap-center border-4 border-white shadow-xl">
                                                        <img src={img} alt="Work Portfolio" className="w-full h-full object-cover" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="w-full h-40 bg-surface-50 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed border-surface-200">
                                                    <Briefcase className="w-8 h-8 text-surface-200 mb-2" />
                                                    <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">No portfolio items available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trust & Verification */}
                                    <div className="mt-12 bg-surface-900 rounded-[2.5rem] p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20">
                                                <img src={p.proofDocument || "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop"} alt="Verification" className="w-full h-full object-cover opacity-80" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-primary font-black text-[10px] uppercase tracking-widest">Verified Identity</span>
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                <p className="text-white font-black text-lg tracking-tight">{String(p.idProofType || 'Government ID')} Linked</p>
                                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Secure & background checked</p>
                                            </div>
                                        </div>
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
