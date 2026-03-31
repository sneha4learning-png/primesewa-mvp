
import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle, Phone, ShieldCheck, Loader2, Filter, Briefcase, Plus as PlusIcon, UserCircle, Hammer, Paintbrush, Wind, Monitor, Scissors, Bug, PieChart as PieChartIcon, AlertCircle, Truck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

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
                        <p className="text-red-600 font-normal text-xl mb-2">Something went wrong</p>
                        <p className="text-gray-500 text-sm mb-4">{this.state.error?.message}</p>
                        <button onClick={() => this.setState({ hasError: false })} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-normal hover:bg-blue-700">Try Again</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const categories = [
    { 
        id: '1', name: 'Plumbing', icon: Droplets, color: 'from-blue-500/10 to-blue-600/5', iconColor: 'text-blue-500', type: 'Job-based', subtitle: 'Pipes & Taps',
        subServices: [
            { name: 'Tap Fix', price: 149 },
            { name: 'Pipe Leak', price: 299 },
            { name: 'Drain Block', price: 449 },
            { name: 'Tank Clean', price: 899 }
        ]
    },
    { 
        id: '2', name: 'Electrical', icon: Zap, color: 'from-amber-500/10 to-amber-600/5', iconColor: 'text-amber-500', type: 'Job-based', subtitle: 'Wiring & Fixes',
        subServices: [
            { name: 'Switch Fix', price: 99 },
            { name: 'Fan Fix', price: 249 },
            { name: 'MCB Fix', price: 349 },
            { name: 'Wiring Check', price: 999 }
        ]
    },
    { 
        id: '3', name: 'Cleaning', icon: Sparkles, color: 'from-emerald-500/10 to-emerald-600/5', iconColor: 'text-emerald-500', type: 'Job-based', subtitle: 'Deep Clean',
        subServices: [
            { name: 'Bathroom Deep Clean', price: 449 },
            { name: 'Kitchen Deep Clean', price: 799 },
            { name: 'Sofa Clean', price: 399 },
            { name: 'Full Home Clean', price: 1499 }
        ]
    },
    { 
        id: '4', name: 'Carpentry', icon: Hammer, color: 'from-orange-500/10 to-orange-600/5', iconColor: 'text-orange-500', type: 'Job-based', subtitle: 'Furniture',
        subServices: [
            { name: 'Hinge/Handle Repair', price: 99 },
            { name: 'Furniture Assembly', price: 499 },
            { name: 'Door Repair/Polishing', price: 399 },
            { name: 'New Wardrobe/Cabinet', price: 2499 }
        ]
    },
    { 
        id: '5', name: 'Painting', icon: Paintbrush, color: 'from-purple-500/10 to-purple-600/5', iconColor: 'text-purple-500', type: 'Job-based', subtitle: 'Home Wall',
        subServices: [
            { name: 'Single Wall Painting', price: 399 },
            { name: 'Kitchen Damp Treatment', price: 899 },
            { name: 'Wall Putty/Texture', price: 599 },
            { name: 'Full Home Painting Consultation', price: 0 }
        ]
    },
    { 
        id: '6', name: 'AC Repair', icon: Wind, color: 'from-cyan-500/10 to-cyan-600/5', iconColor: 'text-cyan-500', type: 'Job-based', subtitle: 'Cooling',
        subServices: [
            { name: 'AC Servicing (Split)', price: 499 },
            { name: 'Gas Charging', price: 1899 },
            { name: 'PCB Repair', price: 1299 },
            { name: 'AC Installation', price: 999 }
        ]
    },
    { 
        id: '7', name: 'Appliance Repair', icon: Monitor, color: 'from-rose-500/10 to-rose-600/5', iconColor: 'text-rose-500', type: 'Job-based', subtitle: 'Fridge & TV',
        subServices: [
            { name: 'Washing Machine Repair', price: 399 },
            { name: 'Refrigerator Repair', price: 449 },
            { name: 'Microwave/Oven Repair', price: 299 },
            { name: 'TV/LED Panel Fix', price: 799 }
        ]
    },
    { 
        id: '10', name: 'Salon for Men', icon: Scissors, color: 'from-indigo-500/10 to-indigo-600/5', iconColor: 'text-indigo-500', type: 'Job-based', subtitle: 'Haircare',
        subServices: [
            { name: 'Haircut', price: 199 },
            { name: 'Shave', price: 149 },
            { name: 'Hair Color', price: 399 },
            { name: 'Facial', price: 599 }
        ]
    },
    { 
        id: '12', name: 'Salon for Women', icon: Scissors, color: 'from-pink-500/10 to-pink-600/5', iconColor: 'text-pink-500', type: 'Job-based', subtitle: 'Beauty',
        subServices: [
            { name: 'Threading', price: 99 },
            { name: 'Haircut', price: 499 },
            { name: 'Facial', price: 999 },
            { name: 'Pedicure', price: 699 }
        ]
    },
    { 
        id: '9', name: 'Pest Control', icon: Bug, color: 'from-red-500/10 to-red-600/5', iconColor: 'text-red-500', type: 'Job-based', subtitle: 'Protection',
        subServices: [
            { name: 'General Pest Control', price: 699 },
            { name: 'Cockroach Management', price: 899 },
            { name: 'Termite Protection', price: 1499 },
            { name: 'Bed Bug Treatment', price: 1199 }
        ]
    },
    { 
        id: '11', name: 'Packers & Movers', icon: Truck, color: 'from-blue-600/10 to-blue-700/5', iconColor: 'text-blue-600', type: 'Job-based', subtitle: 'Safe Move',
        subServices: [
            { name: 'Packing & Shifting', price: 2999 },
            { name: 'Local Shifting', price: 1499 },
            { name: 'Office Shifting', price: 8999 },
            { name: 'Packing Services', price: 999 }
        ]
    }
];



const getServiceImage = (category = '') => {
    const cat = String(category).toLowerCase();
    if (cat.includes('plumb')) return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80";
    if (cat.includes('electri')) return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80";
    if (cat.includes('clean')) return "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80";
    if (cat.includes('carpent')) return "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80";
    if (cat.includes('salon') || cat.includes('beauty')) return "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80";
    if (cat.includes('ac')) return "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80";
    if (cat.includes('paint')) return "https://images.unsplash.com/photo-1589939705384-5185138a04b9?w=800&q=80";
    if (cat.includes('pest')) return "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=800&q=80";
    if (cat.includes('mover') || cat.includes('pack')) return "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80";
    if (cat.includes('appliance')) return "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80";
    return "https://images.unsplash.com/photo-1542013936693-884638332954?w=800&q=80";
};

const ProviderProfileModal = ({ p, onClose, handleBook }) => {
    const [liveJobsCount, setLiveJobsCount] = useState(p?.jobs || p?.jobCount || 0);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const fetchLiveJobs = async () => {
            if (!p?.name) return;
            try {
                const q = query(collection(db, 'bookings'), where('provider', '==', p.name), where('status', '==', 'completed'));
                const snap = await getDocs(q);
                setLiveJobsCount(snap.size);
            } catch (e) {
                console.error("Error fetching live jobs count in modal:", e);
            }
        };
        fetchLiveJobs();
        return () => { document.body.style.overflow = 'unset'; };
    }, [p?.name]);

    if (!p) return null;

    const name = String(p.name || 'Service Specialist');
    const category = Array.isArray(p.category) ? String(p.category[0] || 'General') : String(p.category || 'General specialist');
    const ratingValue = typeof p.rating === 'number' ? p.rating : parseFloat(String(p.rating || 0));
    const price = String(p.price || '499');
    const portfolio = Array.isArray(p.portfolio) ? p.portfolio : [];

    return createPortal(
        <div className="fixed inset-0 w-full h-full bg-black/90 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0 }} onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="relative shrink-0">
                    <div className="h-36 relative overflow-hidden group/header rounded-t-[2.5rem]">
                        <img src={getServiceImage(category)} alt={category} className="w-full h-full object-cover transition-transform duration-700 group-hover/header:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-indigo-950/30 to-transparent"></div>
                        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 backdrop-blur-md hover:bg-black/40 rounded-full text-white transition-all shadow-lg">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute -bottom-10 left-10 z-20">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl font-black text-indigo-600 border-[6px] border-white shadow-2xl shadow-indigo-600/20 overflow-hidden group/modal-avatar">
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-20"></div>
                                <UserCircle className="w-16 h-16 text-indigo-600 relative z-10" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pt-10 px-6 sm:px-10 pb-8 flex-1 overflow-y-auto hide-scrollbar">
                    <div className="flex justify-between items-start mb-6">
                        <div className="pt-2">
                            <h2 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight leading-tight">{name}</h2>
                            <p className="text-[9px] font-normal text-slate-400 uppercase tracking-widest mt-1">{category} • Verified Partner</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => { const phone = String(p.phone || ''); if (!phone) { alert('Contact details unavailable.'); return; } window.location.href = `tel:${phone}`; }} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-xl border border-emerald-100 transition-all flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest hover:bg-emerald-100">
                                <Phone className="w-3 h-3" /> Call
                            </button>
                            <button onClick={() => handleBook(p)} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-[9px] uppercase shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">Book</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100 transition-colors hover:border-amber-200">
                            <Star className="w-4 h-4 text-amber-500 mx-auto mb-1.5 fill-current" />
                            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                                {(liveJobsCount > 0 && ratingValue > 0) ? ratingValue.toFixed(1) : 'New'}
                            </div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{(liveJobsCount > 0 && ratingValue > 0) ? 'Rating' : 'Partner Status'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100 transition-colors hover:border-indigo-200">
                            <Briefcase className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                                {liveJobsCount > 0 ? liveJobsCount : 'Verifying'}
                            </div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Active Jobs</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100 transition-colors hover:border-emerald-200">
                            <IndianRupee className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none tracking-tighter">
                                ₹{Math.min(parseInt(String(price).replace(/\D/g, '')), 199)}
                            </div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Base Cost</div>
                        </div>
                    </div>
                    {portfolio.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-indigo-400" /> Work Showcase
                            </h3>
                            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar snap-x">
                                {portfolio.filter(Boolean).map((img, i) => (
                                    <div key={i} className="shrink-0 snap-start">
                                        <img src={String(img)} onError={(e) => { e.target.onerror = null; e.target.src = getServiceImage(category); }} className="w-44 h-32 sm:w-52 sm:h-36 rounded-2xl object-cover border border-slate-200 shadow-sm transition-transform hover:scale-105 duration-500" alt="Work Sample" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="bg-slate-900 rounded-3xl p-5 flex items-center justify-between border border-white/10 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-indigo-400" /></div>
                            <div>
                                <p className="text-white font-normal text-xs">Verified Professional</p>
                                <p className="text-[8px] text-white/40 uppercase font-medium tracking-widest">Identity & security checked</p>
                            </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0"><Star className="w-4 h-4 text-indigo-600 fill-current" /></div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-900 mb-1 leading-none uppercase tracking-widest">Expert Pick & Ratings</h4>
                                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                                    <strong>Expert Pick:</strong> Algorithms badge for pros with 4.8+ rating and consistent success.<br/>
                                    <strong>Rating:</strong> Average score from direct verified customer feedback.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const BookingDetailsModal = ({ bookingId, onClose }) => {
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) return;
        const unsub = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("DEBUG: LIVE BOOKING DATA RECIEVED", data);
                setBooking({ id: docSnap.id, ...data });
            }
            setLoading(false);
        });
        return () => unsub();
    }, [bookingId]);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        if (timeStr.includes('-')) return timeStr; // Already has duration
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        
        // Calculate end time (+1 hour)
        let endHour = (hour + 1);
        const endAmpm = endHour >= 24 ? 'AM' : endHour >= 12 ? 'PM' : 'AM';
        endHour = endHour % 12 || 12;

        return `${displayHour}:${minutes} ${ampm} - ${endHour}:${minutes} ${endAmpm}`;
    };

    const getStatusColor = (status) => {
        switch (String(status).toLowerCase()) {
            case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
            case 'confirmed': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
            case 'rejected':
            case 'cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    if (loading || !booking) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-slate-50 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto hide-scrollbar border border-white/10">
                <button onClick={onClose} className="absolute top-8 right-8 z-10 p-3 bg-white/80 backdrop-blur hover:bg-rose-500 hover:text-white rounded-2xl shadow-xl transition-all group active:scale-95">
                    <XCircle className="w-6 h-6" />
                </button>

                {/* DUAL COLOR GRADIENT HEADER */}
                <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 border-b border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full -ml-20 -mb-20 blur-2xl"></div>
                    
                    <div className="p-8 sm:p-10 relative z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:items-center">
                            <div>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-2 leading-none">Booking Summary</p>
                                <h1 className="text-3xl font-black text-white tracking-tighter leading-none">{booking.service}</h1>
                            </div>
                            <div className={`px-5 py-2.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${getStatusColor(booking.status)}`}>
                                {booking.status}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 sm:p-10 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-5 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date & Time
                                    </label>
                                    <p className="text-sm font-black text-slate-700">{booking.date} at {formatTime(booking.slot)}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Service Location
                                    </label>
                                    <p className="text-sm font-bold text-slate-600 leading-relaxed truncate">
                                        {(booking.houseNo && booking.area) 
                                            ? `${booking.houseNo}, ${booking.area}` 
                                            : (booking.address || 'Address registered')}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-indigo-600 p-8 rounded-[2rem] border border-indigo-500 shadow-xl shadow-indigo-600/10 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <label className="text-[9px] font-black text-indigo-100 uppercase tracking-widest leading-none">Total Payment</label>
                                        <p className="text-4xl font-black tracking-tighter mt-1">₹{booking.price || '0'}</p>
                                    </div>
                                    <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1 mt-3">
                                        <CheckCircle2 className="w-3 h-3" /> Pay After Service
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* LIVE TRACKER MAP */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Live Tracker
                            </h3>
                            <div className="w-full h-40 rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50 relative group">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    scrolling="no" 
                                    marginHeight="0" 
                                    marginWidth="0" 
                                    src={`https://maps.google.com/maps?width=100%25&height=160&hl=en&q=${encodeURIComponent(booking.houseNo ? `${booking.houseNo}, ${booking.area}` : booking.address)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                                    className="grayscale-[0.1] contrast-[0.9] brightness-[1.02] group-hover:grayscale-0 transition-all duration-700"
                                ></iframe>
                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-100 flex items-center gap-2 animate-bounce">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[8px] font-black uppercase text-slate-900 tracking-widest">Tracking Live</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 border-t border-slate-100 pt-8">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Assigned Specialist</h3>
                            <div className="flex items-center justify-between p-5 bg-white rounded-[2.5rem] border border-slate-100 group transition-all hover:bg-slate-50 hover:shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-600 shadow-inner group-hover:rotate-3 transition-transform overflow-hidden border border-indigo-100 relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                                        <UserCircle className="w-8 h-8 relative z-10" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-slate-900 uppercase tracking-tight">
                                            {(() => {
                                                const pName = booking.provider || booking.providerName || booking.expert;
                                                const hasProviderName = pName && String(pName).toLowerCase() !== 'unassigned';
                                                
                                                if (hasProviderName) return pName;
                                                if (booking.providerUid) return `Expert #${String(booking.providerUid).slice(-4).toUpperCase()}`;
                                                return 'Assigning Expert...';
                                            })()}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                                            {(booking.provider || booking.providerName || booking.expert) ? 'Verified Expert' : 'Searching for your professional'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { if (booking.providerPhone) window.location.href = `tel:${booking.providerPhone}`; else alert('Phone number not available'); }}
                                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all border border-slate-100"
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {booking.description && (
                            <div className="space-y-3 border-t border-slate-100 pt-8">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Specific Instructions</h3>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed italic bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50">
                                    "{booking.description}"
                                </p>
                            </div>
                        )}

                        <div className="pt-8 text-center border-t border-slate-100">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 rounded-2xl">
                                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                <p className="text-[9px] font-black text-white uppercase tracking-widest">PrimeSewa Security Covered</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
        document.body
    );
};

const CustomerHome = () => {
    const { userData } = useAuth();
    const { sendNotification } = useNotifications();

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookingStep, setBookingStep] = useState(0); 
    const [onlineProviders, setOnlineProviders] = useState([]);
    const [activeBookings, setActiveBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [sortBy] = useState('rating');
    const [ratingFilter] = useState('0');
    const [selectedProviderProfile, setSelectedProviderProfile] = useState(null);
    const catalogRef = useRef(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingSlot, setBookingSlot] = useState('');
    const [bookingDesc, setBookingDesc] = useState('');
    const [bookingHouseNo, setBookingHouseNo] = useState('');
    const [bookingArea, setBookingArea] = useState('');
    const [bookingCity] = useState('Ahmedabad');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const addressSearchTimeout = useRef(null);
    const [selectedSubServices, setSelectedSubServices] = useState([]);
    const [ratingState, setRatingState] = useState({ bookingId: null, rating: 0 });
    const [selectedBooking, setSelectedBooking] = useState(null);

    const getTodayStr = () => new Date().toISOString().split('T')[0];

    const availableSlots = useMemo(() => {
        const slots = [
            { id: '09:00', label: '09:00 AM - 10:00 AM', hour: 9 },
            { id: '10:00', label: '10:00 AM - 11:00 AM', hour: 10 },
            { id: '11:00', label: '11:00 AM - 12:00 PM', hour: 11 },
            { id: '12:00', label: '12:00 PM - 01:00 PM', hour: 12 },
            { id: '13:00', label: '01:00 PM - 02:00 PM', hour: 13 },
            { id: '14:00', label: '02:00 PM - 03:00 PM', hour: 14 },
            { id: '15:00', label: '03:00 PM - 04:00 PM', hour: 15 },
            { id: '16:00', label: '04:00 PM - 05:00 PM', hour: 16 },
            { id: '17:00', label: '05:00 PM - 06:00 PM', hour: 17 },
            { id: '18:00', label: '06:00 PM - 07:00 PM', hour: 18 },
        ];
        
        if (bookingDate === getTodayStr()) {
            const currentHour = new Date().getHours();
            // Map slots to include isPast status instead of filtering
            return slots.map(s => ({
                ...s,
                isPast: s.hour <= currentHour
            }));
        }
        return slots.map(s => ({ ...s, isPast: false }));
    }, [bookingDate]);

    useEffect(() => {
        if (bookingSlot) {
            const selected = availableSlots.find(s => s.id === bookingSlot);
            if (selected && selected.isPast) {
                setBookingSlot('');
            }
        }
    }, [availableSlots, bookingSlot]);

    const handleMyLocation = () => {
        if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const data = await res.json();
                if (data.display_name) {
                    const primary = data.display_name.split(',')[0].trim();
                    const secondary = (data.address.suburb || data.address.neighbourhood || '').trim();
                    if (primary === secondary || !secondary) {
                        setBookingArea(primary);
                    } else {
                        setBookingArea(`${primary}, ${secondary}`);
                    }
                }
            } catch (e) { console.error(e); }
            setIsLocating(false);
        }, () => setIsLocating(false));
    };

    const handleAddressSearch = (query) => {
        setBookingArea(query);
        if (query.trim().length < 3) {
            setAddressSuggestions([]);
            return;
        }

        if (addressSearchTimeout.current) clearTimeout(addressSearchTimeout.current);
        
        addressSearchTimeout.current = setTimeout(async () => {
            setIsSearchingAddress(true);
            try {
                // RESTRICT TO AHMEDABAD, INDIA FOR DEMO RELEVANCE
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Ahmedabad')}&format=json&addressdetails=1&limit=5&countrycodes=in`);
                const data = await res.json();
                // Filter to ensure results are in Ahmedabad
                setAddressSuggestions((data || []).filter(s => s.display_name.toLowerCase().includes('ahmedabad')));
            } catch (e) {
                console.error("OSM Search Error:", e);
            } finally {
                setIsSearchingAddress(false);
            }
        }, 600);
    };

    useEffect(() => {
        const unsubscribeProviders = onSnapshot(collection(db, 'providers'), (snapshot) => {
            const allProviders = [];
            snapshot.forEach(d => allProviders.push({ id: d.id, ...d.data() }));
            setOnlineProviders(allProviders.filter(p => (p.status === 'active' || p.status === 'approved') && p.isOnline));
        });

        if (userData?.uid) {
            const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
                const allMyBookings = [];
                snapshot.forEach(d => {
                    const b = { id: d.id, ...d.data() };
                    if (b.customerUid === userData.uid || b.customerPhone === userData.phone) allMyBookings.push(b);
                });
                const sorted = allMyBookings.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                // LIMITED TO 5 PER USER REQUEST
                setActiveBookings(sorted.filter(b => !['completed', 'rejected', 'cancelled'].includes(b.status)).slice(0, 5));
                setPastBookings(sorted.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status)).slice(0, 5));
            });
            return () => { unsubscribeProviders(); unsubscribeBookings(); };
        }
        return () => unsubscribeProviders();
    }, [userData]);

    const handleBook = (provider) => {
        if (!userData) {
            alert("Please sign in or register to book a service with our experts.");
            return;
        }

        // FINAL DYNAMIC PRICE: CUSTOMER SPECIFIC PROVIDER RATE + Sub-Services with unique provider factor
        const baseRate = Math.min(parseInt(String(provider.price || 149).replace(/\D/g, '')), 199);
        // Apply a unique experience multiplier based on provider ID (0.94x to 1.14x) for diversity
        const pFactor = 0.94 + ((provider.id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 20) / 100;
        const servicesTotal = selectedSubServices.reduce((sum, s) => {
            const rate = provider.subServiceRates?.[s.name] || Math.round(s.price * pFactor);
            return sum + rate;
        }, 0);
        const finalTotal = baseRate + servicesTotal;
        
        const pName = provider.name || provider.providerName || provider.expert || 'Expert Partner';
        const pUid = provider.id || provider.uid || '';
        const pPhone = provider.phone || '';

        setPendingBookingData({ 
            provider: pName,
            providerUid: pUid,
            providerPhone: pPhone,
            price: finalTotal, 
            category: selectedCategory,
            service: selectedSubServices.length > 0 
                ? `${selectedCategory} (${selectedSubServices.map(s => s.name).join(', ')})`
                : `${selectedCategory} Expert Consultation`
        });
        setBookingStep(1);
        setSelectedProviderProfile(null);
    };

    const confirmBooking = async (e) => {
        e.preventDefault();
        
        if (!userData) {
            alert("Session expired or you are not signed in. Please sign in to complete your booking.");
            return;
        }

        if (!pendingBookingData) {
            alert("Booking session lost. Please select your service and expert again.");
            setBookingStep(0);
            return;
        }

        if (!bookingSlot) {
            alert("Please select a time slot for your appointment.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            // EXPLICIT DATA EXTRACTION FOR MAXIMUM PERSISTENCE
            const nameToSave = pendingBookingData.provider || pendingBookingData.name || '';
            
            if (!nameToSave || nameToSave.toLowerCase() === 'unassigned') {
                alert("Expert assignment error. Please re-select your preferred provider from the catalog.");
                setIsSubmitting(false);
                return;
            }

            const priceToSave = pendingBookingData.price || 0;
            const uidToSave = pendingBookingData.providerUid || pendingBookingData.uid || '';
            const phoneToSave = pendingBookingData.providerPhone || '';

            const booking = {
                service: pendingBookingData.service || 'PrimeSewa Service',
                status: 'pending',
                provider: nameToSave,
                providerName: nameToSave, // Save both to be safe
                providerUid: uidToSave,
                providerPhone: phoneToSave,
                customer: userData.name || userData.displayName || 'Prime Customer',
                customerUid: userData.uid,
                customerPhone: userData.phone || userData.phoneNumber || '',
                price: priceToSave,
                date: bookingDate,
                slot: bookingSlot,
                description: bookingDesc,
                houseNo: bookingHouseNo,
                area: bookingArea,
                city: bookingCity,
                address: `${bookingHouseNo}, ${bookingArea}, ${bookingCity}`,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'bookings'), booking);
            
            // NOTIFY ADMIN & PROVIDER
            const customerName = userData.name || userData.displayName || 'A new customer';
            
            // 1. Notify Admin
            if (typeof sendNotification === 'function') {
                sendNotification('admin', 'New Booking Created', `${customerName} booked ${booking.service} with ${nameToSave}.`, 'info');
            }

            // 2. Notify Provider (using their UID if we have it)
            if (uidToSave && typeof sendNotification === 'function') {
                sendNotification(uidToSave, 'New Job Request', `You have a new request for ${booking.service} from ${customerName}.`, 'success');
            }

            setBookingStep(2);
            setTimeout(() => setBookingStep(0), 3000);
        } catch (err) {
            console.error("Booking Error:", err);
            alert("Could not process booking: " + err.message);
        } finally { setIsSubmitting(false); }
    };

    const displayedProviders = useMemo(() => {
        return onlineProviders.filter(p => {
            if (selectedCategory && !p.category?.includes(selectedCategory)) return false;
            if (ratingFilter !== '0' && (p.rating || 0) < parseFloat(ratingFilter)) return false;
            if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        }).sort((a, b) => sortBy === 'rating' ? (b.rating || 0) - (a.rating || 0) : 0);
    }, [onlineProviders, selectedCategory, ratingFilter, searchQuery, sortBy]);

    const submitRating = async (booking) => {
        if (ratingState.rating > 0) {
            try {
                // 1. Update Booking Record
                await updateDoc(doc(db, 'bookings', booking.id), { rated: true, ratingGiven: ratingState.rating });
                
                // 2. Update Provider's Global Rating (Optimistic average for demo)
                if (booking.providerUid) {
                    const provRef = doc(db, 'providers', booking.providerUid);
                    // Standard demo logic: (avg * count + new) / (count + 1)
                    // But for the demo simplicity, we'll just push a fresh 5.0 or 4.9 style rating if it's the first few
                    const snap = await getDocs(query(collection(db, 'bookings'), where('providerUid', '==', booking.providerUid), where('rated', '==', true)));
                    const ratings = snap.docs.map(d => d.data().ratingGiven || 0);
                    const avg = ratings.reduce((a, b) => a + b, 0) / (ratings.length || 1);
                    
                    await updateDoc(provRef, { 
                        rating: parseFloat(avg.toFixed(1)), 
                        ratingCount: ratings.length 
                    });
                }
                
                setRatingState({ bookingId: null, rating: 0 });
                alert("Thank you for your feedback!");
            } catch (err) {
                console.error("Rating submission error:", err);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 animate-fade-in">
            <div className={`mb-12 relative overflow-hidden rounded-[3rem] shadow-2xl transition-all duration-700 ${!userData?.uid ? 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 p-12 md:p-32 text-white' : 'bg-gradient-to-br from-white via-white to-indigo-50/30 border border-slate-100 p-8 md:p-14'}`}>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h1 className={`text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-6 ${!userData?.uid ? 'text-white' : 'text-slate-900 font-medium'}`}>
                        {userData?.name ? `Hello, ${userData.name.split(' ')[0]}` : 'Platform for Prime Services'}
                    </h1>
                    <p className={`${!userData?.uid ? 'text-slate-400' : 'text-slate-500'} text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto`}>Trustworthy professionals for every household needs</p>
                    
                    {/* PROFESSIONAL SEARCH BAR */}
                    <div className="relative max-w-2xl mx-auto group">
                        <div className="absolute inset-0 bg-indigo-600/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full"></div>
                        <div className="relative flex items-center bg-white shadow-2xl rounded-[2rem] border border-slate-100 p-2 transition-all group-focus-within:ring-4 group-focus-within:ring-indigo-500/10">
                            <div className="flex-1 flex items-center gap-4 px-6">
                                <Search className="w-6 h-6 text-indigo-600" />
                                <input 
                                    type="text" 
                                    placeholder="Search for 'Plumbing', 'Cleaning', or 'Salon'..." 
                                    className="w-full py-4 text-slate-800 font-bold placeholder-slate-400 outline-none"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        // If search has text, don't necessarily deselect category, but allow filter to work
                                    }}
                                />
                            </div>
                            <button className="hidden md:block px-10 py-4 bg-indigo-600 hover:bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Search</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-16">
                <div className="flex items-end justify-between mb-8 px-4">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Categories</h3>
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900">Choose a Service</h2>
                    </div>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-x-2 gap-y-8 px-2 overflow-x-auto hide-scrollbar pb-4">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubServices([]); }} className={`flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-2 group shrink-0 ${selectedCategory === cat.name ? 'scale-105' : 'opacity-80 hover:opacity-100'}`}>
                            <div className={`w-14 h-14 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${selectedCategory === cat.name ? 'bg-indigo-600 shadow-xl shadow-indigo-600/30' : 'bg-white border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg'}`}>
                                <cat.icon className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${selectedCategory === cat.name ? 'text-white' : cat.iconColor}`} />
                            </div>
                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center transition-colors ${selectedCategory === cat.name ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-400'}`}>{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {bookingStep === 1 ? (
                <div className="max-w-4xl bg-white rounded-[3rem] shadow-2xl p-10 md:p-16 mx-auto animate-fade-in border border-slate-100">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Confirm Booking</h2>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Review your details & professional schedule</p>
                        </div>
                        <button onClick={() => setBookingStep(0)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><XCircle className="w-8 h-8 text-slate-300 hover:text-rose-500" /></button>
                    </div>

                    <form onSubmit={confirmBooking} className="space-y-12">
                        {/* SERVICE REVIEW & PRICE SECTION */}
                        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                            <div className="relative z-10">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">You have selected</p>
                                <h3 className="text-xl font-medium text-slate-100 mb-2 leading-tight uppercase tracking-tight">{pendingBookingData?.service}</h3>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <p className="text-[11px] font-bold text-slate-400 capitalize">Expert: {pendingBookingData?.provider || 'Professional'}</p>
                                </div>
                                <div className="flex items-end justify-between pt-6 border-t border-white/10">
                                    <div className="flex-1">
                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Total Payable Amount</p>
                                        <p className="text-4xl font-black text-white tracking-tighter">₹{pendingBookingData?.price}</p>
                                        {selectedSubServices.length === 0 && (
                                            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-normal">
                                                    Expert Visiting Fee Applied <br/>
                                                    <span className="text-[8px] text-amber-200/40 font-medium normal-case tracking-normal">As no additional sub-services are selected, the base professional visiting fee of ₹199 is being applied for the expert's inspection & consultation.</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <Sparkles className="w-8 h-8 text-indigo-400 opacity-20" />
                                </div>
                            </div>
                        </div>

                        {/* DYNAMIC SERVICE SELECTION AT CHECKOUT */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <PlusIcon className="w-3.5 h-3.5 text-indigo-500" /> Adjust Services
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(categories.find(c => c.name === selectedCategory)?.subServices || []).map(s => {
                                    const isSelected = selectedSubServices.some(x => x.name === s.name);
                                    return (
                                        <button key={s.name} type="button" onClick={() => {
                                            const newSelection = isSelected 
                                                ? selectedSubServices.filter(x => x.name !== s.name)
                                                : [...selectedSubServices, s];
                                            setSelectedSubServices(newSelection);
                                            
                                            // UPDATE LIVE PRICE IN PENDING DATA WITH PROVIDER FACTOR
                                            const providerObj = onlineProviders.find(op => op.name === pendingBookingData?.provider);
                                            const providerBase = Math.min(parseInt(String(providerObj?.price || 149).replace(/\D/g, '')), 199);
                                            const pFactor = 0.94 + ((providerObj?.id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 20) / 100;
                                            const newTotal = providerBase + newSelection.reduce((a,b) => {
                                                const rate = providerObj?.subServiceRates?.[b.name] || Math.round(b.price * pFactor);
                                                return a + rate;
                                            }, 0);
                                            setPendingBookingData(prev => ({ 
                                                ...prev, 
                                                price: newTotal,
                                                service: newSelection.length > 0 
                                                    ? `${selectedCategory} (${newSelection.map(x => x.name).join(', ')})`
                                                    : `${selectedCategory} Expert Consultation (Base Price Only)`
                                            }));
                                        }} className={`p-4 border-2 rounded-[1.5rem] text-left transition-all group ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                                            <p className={`text-[10px] font-black uppercase mb-1 tracking-tighter ${isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>{s.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400">₹{(() => {
                                                const providerObj = onlineProviders.find(op => op.name === pendingBookingData?.provider);
                                                const pFactor = 0.94 + ((providerObj?.id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 20) / 100;
                                                return providerObj?.subServiceRates?.[s.name] || Math.round(s.price * pFactor);
                                            })()}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Choose Date
                                    </label>
                                    <input required type="date" value={bookingDate} min={getTodayStr()} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-inner" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" /> Select Time Slot
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {availableSlots.map(s => (
                                            <button 
                                                key={s.id} 
                                                type="button" 
                                                onClick={() => !s.isPast && setBookingSlot(s.id)} 
                                                disabled={s.isPast}
                                                className={`py-4 px-3 border-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter transition-all duration-300 ${s.isPast ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50' : bookingSlot === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white border-slate-50 text-slate-400 hover:border-indigo-200'}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Service Location
                                    </label>
                                    <button type="button" onClick={handleMyLocation} disabled={isLocating} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                                        {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                        Use My Location
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase ml-2">House/Apt</p>
                                        <input required placeholder="eg. 402, Sunshine Villa" value={bookingHouseNo} onChange={e => setBookingHouseNo(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-inner" />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase ml-2">Locality / Landmark</p>
                                        <div className="relative group">
                                            <input 
                                                required 
                                                placeholder="eg. Near City Mall" 
                                                value={bookingArea} 
                                                onChange={e => handleAddressSearch(e.target.value)} 
                                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-inner" 
                                            />
                                            {isSearchingAddress && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                                        </div>
                                        {addressSuggestions.length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                {addressSuggestions.map((s, idx) => (
                                                    <button 
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setBookingArea(s.display_name.split(',')[0] + (s.display_name.split(',')[1] ? ', ' + s.display_name.split(',')[1] : ''));
                                                            setAddressSuggestions([]);
                                                        }}
                                                        className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-start gap-3 transition-colors"
                                                    >
                                                        <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 leading-tight">{s.display_name.split(',')[0]}</p>
                                                            <p className="text-[10px] text-slate-400 truncate max-w-[280px]">{s.display_name.split(',').slice(1, 4).join(', ')}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <textarea placeholder="Any specific instructions for the expert? (Optional)" value={bookingDesc} onChange={e => setBookingDesc(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-inner min-h-[120px]" />
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/40 transition-all duration-300 active:scale-95 flex items-center justify-center gap-3">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {isSubmitting ? 'Finalizing Your Request...' : 'Confirm & Proceed to Booking'}
                        </button>
                    </form>
                </div>
            ) : bookingStep === 2 ? (
                <div className="max-w-lg bg-emerald-500 p-12 rounded-3xl mx-auto text-center text-white shadow-2xl animate-bounce">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-6" />
                    <h2 className="text-4xl font-medium">Confirmed!</h2>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8">
                        {activeBookings.length > 0 && (
                            <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/10">
                                <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Live Bookings
                                </h2>
                                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                    {activeBookings.map(b => (
                                        <div key={b.id} className="shrink-0 w-80 bg-white/5 p-6 rounded-3xl border border-white/10">
                                            <h3 className="text-white font-bold text-sm mb-2">{b.service}</h3>
                                            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-4">Status: {b.status}</p>
                                            <button onClick={() => setSelectedBooking(b.id)} className="w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-colors">View Details</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedCategory && (
                            <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                                <h3 className="text-2xl font-black mb-6">Select {selectedCategory} Services</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {categories.find(c => c.name === selectedCategory)?.subServices.map(sub => {
                                        const isSelected = selectedSubServices.find(s => s.name === sub.name);
                                        return (
                                            <div 
                                                key={sub.name} 
                                                onClick={() => setSelectedSubServices(p => isSelected ? p.filter(s => s.name !== sub.name) : [...p, sub])} 
                                                className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${isSelected ? 'border-indigo-600 bg-white shadow-2xl scale-105' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'}`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in">
                                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col h-full justify-between">
                                                    <div>
                                                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>{sub.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Expert service included</p>
                                                    </div>
                                                    <p className="text-[9px] font-black tracking-widest text-indigo-400/60 uppercase mt-auto">Service Included</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                                            {/* PROFESSIONALS LISTING - NOW SHOWS RECOMMENDED BY DEFAULT IF NO CATEGORY IS SELECTED */}
                        {selectedCategory ? (
                            <div className="space-y-6 animate-fade-in" ref={catalogRef} id="service-catalog">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">{selectedCategory} Professionals</h3>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Recommended Experts</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Providers</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {displayedProviders.length > 0 ? displayedProviders.map(p => {
                                        return (
                                            <div key={p.id} className="bg-white p-7 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden relative">
                                                {/* PERMANENT SOLUTION: USE EXPLICIT EXPERT FLAG FROM DATABASE */}
                                                {p.isExpert && (
                                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-700 to-indigo-500 px-4 py-2 rounded-bl-[1.5rem] flex items-center gap-2 shadow-lg z-10 transition-transform group-hover:scale-110">
                                                        <Star className="w-3.5 h-3.5 text-white fill-current" />
                                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Expert Pick</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-6 mb-8">
                                                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-105 transition-all relative overflow-hidden bg-slate-50">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50"></div>
                                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg relative z-10 transition-transform group-hover:rotate-12">
                                                            <UserCircle className="w-8 h-8" />
                                                        </div>
                                                        <UserCircle className="absolute w-full h-full text-indigo-100/50 -bottom-4 -right-4 opacity-50" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none mb-2">{p.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex bg-amber-50 px-2 py-1 rounded-lg items-center gap-1">
                                                                <Star className="w-3 h-3 text-amber-500 fill-current" />
                                                                <span className="text-[11px] font-black text-amber-600 uppercase">
                                                                    {(p.jobs > 0 && p.rating > 0) ? parseFloat(p.rating).toFixed(1) : 'New'}
                                                                </span>
                                                            </div>
                                                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                            <span className="text-[10px] font-bold text-slate-400 capitalize">{p.category || 'Prime'} Professional</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-7 border-t border-slate-50">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">
                                                            Total for Selection
                                                        </p>
                                                        <p className="text-3xl font-black text-indigo-600 tracking-tighter">
                                                            ₹{(() => {
                                                                const base = Math.min(parseInt(String(p.price || 149).replace(/\D/g, '')), 199);
                                                                // Apply same pFactor logic for visual consistency in the catalog
                                                                const pFactor = 0.94 + ((p.id || '').split('').reduce((a,c) => a + (c.charCodeAt(0) || 0), 0) % 20) / 100;
                                                                const subTotal = selectedSubServices.reduce((a,s) => {
                                                                    const rate = p.subServiceRates?.[s.name] || Math.round(s.price * pFactor);
                                                                    return a + rate;
                                                                }, 0);
                                                                return subTotal + base;
                                                            })()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button onClick={() => setSelectedProviderProfile(p)} className="h-14 px-5 bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-100 transition-all shadow-sm hover:shadow-md">Info</button>
                                                        <button onClick={() => handleBook(p)} className="h-14 px-10 bg-indigo-600 hover:bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.1em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95">Book Now</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="md:col-span-2 py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-500 font-bold">No professionals found matching your filters.</p>
                                            <button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }} className="mt-4 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Clear all filters</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center bg-indigo-50/30 rounded-[4rem] border border-dashed border-indigo-100">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/5">
                                    <Zap className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2 uppercase">Ready to started?</h3>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto text-xs leading-relaxed uppercase tracking-widest">
                                    Please select a service category above to discover verified experts in your area.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <h2 className="text-xl font-black mb-6">Recent History</h2>
                            <div className="space-y-4">
                                {pastBookings.map(b => (
                                    <div key={b.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-bold text-indigo-600 uppercase mb-1">{b.service}</p>
                                        <h4 className="text-xs font-bold">{b.provider}</h4>
                                        <p className="text-[10px] text-slate-400 mt-2">₹{b.price} • {b.status}</p>
                                        {b.status === 'completed' && !b.rated && (
                                            <div className="flex gap-1 mt-3">
                                                {[1, 2, 3, 4, 5].map(s => <Star key={s} onClick={() => setRatingState({ bookingId: b.id, rating: s })} className={`w-4 h-4 cursor-pointer ${s <= (ratingState.bookingId === b.id ? ratingState.rating : 0) ? 'text-amber-500 fill-current' : 'text-slate-200'}`} />)}
                                                {ratingState.bookingId === b.id && <button onClick={() => submitRating(b)} className="ml-auto text-[8px] font-bold text-indigo-600 uppercase">Submit</button>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {selectedProviderProfile && <ProviderProfileModal p={selectedProviderProfile} onClose={() => setSelectedProviderProfile(null)} handleBook={handleBook} />}
            {selectedBooking && <BookingDetailsModal bookingId={selectedBooking} onClose={() => setSelectedBooking(null)} />}
        </div>
    );
};

export default function CustomerHomeWithErrorBoundary() {
    return <ErrorBoundary><CustomerHome /></ErrorBoundary>;
}
