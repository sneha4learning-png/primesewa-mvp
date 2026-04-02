// PRIME SEWA DEPLOYMENT TRIGGER: RELIABLE BUILD 2026-04-01-T18:30
import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { createPortal } from 'react-dom';
import OSMMap from '../../components/OSMMap';

import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp, onSnapshot, or } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle, Phone, ShieldCheck, Loader2, Filter, Briefcase, Plus as PlusIcon, UserCircle, Hammer, Paintbrush, Wind, Monitor, Scissors, Bug, PieChart as PieChartIcon, AlertCircle, Truck, ArrowRight, TrendingUp, Activity, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line } from 'recharts';

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
                            <p className="text-[9px] font-normal text-slate-400 uppercase tracking-widest mt-1">{category} • Prime Specialist</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => { const phone = String(p.phone || ''); if (!phone) { alert('Contact details unavailable.'); return; } window.location.href = `tel:${phone}`; }} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-xl border border-emerald-100 transition-all flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest hover:bg-emerald-100">
                                <Phone className="w-3 h-3" /> Call
                            </button>
                            <button onClick={() => { handleBook(p); onClose(); }} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-[9px] uppercase shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">Book</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100 transition-colors hover:border-amber-200">
                            <Star className="w-4 h-4 text-amber-500 mx-auto mb-1.5 fill-current" />
                            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                                {(liveJobsCount > 0 && ratingValue > 0 && (p.ratingCount || 0) > 0) ? ratingValue.toFixed(1) : 'New'}
                            </div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{(liveJobsCount > 0 && ratingValue > 0 && (p.ratingCount || 0) > 0) ? 'Rating' : 'Partner Status'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100 transition-colors hover:border-indigo-200">
                            <Briefcase className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                                {liveJobsCount > 0 ? liveJobsCount : 'New Hub'}
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
                </div>
            </div>
        </div>,
        document.body
    );
};

const HistoryItem = ({ b, submitRating }) => {
    const [rating, setRating] = useState(0);
    const [testimonial, setTestimonial] = useState('');
    const [showForm, setShowForm] = useState(true);

    return (
        <div key={b.id} className="group/item bg-white rounded-[2.5rem] border border-slate-100 p-6 hover:shadow-xl transition-all duration-500 relative overflow-hidden flex flex-col justify-between w-full">
            <div className="flex justify-between items-start mb-6">
                <div className="px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${b.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{b.status}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-300">#{b.id.slice(-4).toUpperCase()}</span>
            </div>
            
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1.5">{b.service}</p>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{b.provider}</h4>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount</p>
                    <p className="text-2xl font-black text-slate-950">₹{b.price}</p>
                </div>
            </div>
            
            {b.status === 'completed' && !b.rated && (
                <div className="mt-6 pt-6 border-t border-slate-50">
                    {showForm ? (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Rate Your Experience</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} onClick={(e) => { e.stopPropagation(); setRating(s); }} className={`w-6 h-6 cursor-pointer transition-all hover:scale-125 ${s <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <textarea placeholder="Describe your service experience..." value={testimonial} onChange={(e) => setTestimonial(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 min-h-[90px] resize-none" />
                            <div className="flex gap-4">
                                <button onClick={(e) => { e.stopPropagation(); submitRating(b, rating, testimonial); }} disabled={rating === 0} className="flex-1 py-4 bg-slate-950 hover:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all disabled:bg-slate-200 shadow-lg shadow-slate-950/10">Submit Review</button>
                                <button onClick={(e) => { e.stopPropagation(); setShowForm(false); }} className="px-8 py-4 bg-white text-slate-400 text-[11px] font-black uppercase rounded-2xl border border-slate-100 hover:bg-slate-50">Skip</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} className="w-full py-4 bg-slate-50 hover:bg-slate-950 group/btn rounded-2xl transition-all border border-slate-100 flex items-center justify-center gap-3">
                            <Star className="w-5 h-5 text-amber-500 group-hover:rotate-12 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white">Review Professional</span>
                        </button>
                    )}
                </div>
            )}

            {b.status === 'completed' && b.rated && (
                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-3 leading-none italic">
                        <CheckCircle2 className="w-5 h-5" /> Service Rated
                    </span>
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-5 h-5 ${s <= (b.ratingGiven || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-100'}`} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityOverviewModal = ({ activeBookings, pastBookings, submitRating, onClose, acceptOffer, rejectOffer, openTracking }) => {
    return createPortal(
        <div className="fixed inset-0 z-[100000] bg-indigo-950/60 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8" onClick={onClose}>
            <div className="bg-slate-50 w-full max-w-7xl h-full max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="bg-white px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Activity Hub</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Live tracking and member service history</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-[2rem] text-slate-400 transition-all active:scale-95">
                        <XCircle className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* LEFT: LIVE ACTIVITY BLOCK */}
                    <div className="w-full md:w-5/12 border-r border-slate-100 flex flex-col bg-slate-50/50 p-8">
                        <div className="flex items-center gap-3 mb-8">
                             <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                             <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Live Activity</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar-indigo">
                            {activeBookings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                    <Activity className="w-12 h-12 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">No Live Activity</p>
                                </div>
                            ) : (
                                activeBookings.map(b => (
                                    <div key={b.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-500 group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-widest">{b.status}</div>
                                            <span className="text-[10px] font-bold text-slate-300">#{b.id.slice(-4).toUpperCase()}</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none mb-3 group-hover:text-indigo-600 transition-colors">{b.service}</h4>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{b.provider || 'Assigning Hub Partner...'}</p>
                                        
                                        {(b.status === 'Negotiating' || b.status === 'negotiating') && b.offerPrice && (
                                            <div className="mt-8 p-6 bg-slate-950 rounded-[2rem] border border-white/10 text-white italic shadow-2xl">
                                                <div className="flex items-center justify-between mb-6">
                                                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Counter Offer</p>
                                                    <p className="text-3xl font-black">₹{b.offerPrice}</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => acceptOffer(b)} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-emerald-500/20">Accept</button>
                                                    <button onClick={() => rejectOffer(b)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all">Decline</button>
                                                </div>
                                            </div>
                                        )}
                                        {b.status === 'accepted' && (
                                            <button onClick={() => openTracking(b.id)} className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-indigo-600/20">Track Specialist</button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: RECENT HISTORY BLOCK */}
                    <div className="flex-1 flex flex-col bg-white p-8">
                        <div className="flex items-center gap-3 mb-8">
                             <Clock className="w-6 h-6 text-indigo-600" />
                             <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">RECENT HISTORY</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar-indigo">
                             {pastBookings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                    <Clock className="w-12 h-12 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">History is Empty</p>
                                </div>
                             ) : (
                                <div className="grid grid-cols-1 gap-6 w-full">
                                    {pastBookings.map(b => (
                                        <HistoryItem key={b.id} b={b} submitRating={submitRating} />
                                    ))}
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};


const BookingDetailsModal = ({ bookingId, onClose, sendNotification }) => {
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) return;
        const unsub = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
            if (docSnap.exists()) setBooking({ id: docSnap.id, ...docSnap.data() });
            setLoading(false);
        });
        return () => unsub();
    }, [bookingId]);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
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

    if (loading || !booking) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-slate-50 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/10">
                <div className="bg-indigo-950 p-12 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-xl"><XCircle className="w-6 h-6" /></button>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Booking Detail</p>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">{booking.service}</h1>
                    <div className="mt-4 px-4 py-1.5 bg-emerald-500 rounded-full inline-block text-[9px] font-black uppercase tracking-widest">{booking.status}</div>
                </div>
                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6 text-sm font-black">
                         <div>
                            <p className="text-[9px] text-slate-400 uppercase mb-1">Schedule</p>
                            <p>{booking.date} at {formatTime(booking.slot)}</p>
                         </div>
                         <div>
                            <p className="text-[9px] text-slate-400 uppercase mb-1">Total</p>
                            <p className="text-2xl text-indigo-600">₹{booking.price}</p>
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
    const catalogRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookingStep, setBookingStep] = useState(0); 
    const [onlineProviders, setOnlineProviders] = useState([]);
    const [activeBookings, setActiveBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [allMyBookings, setAllMyBookings] = useState([]);
    const [pendingBookingData, setPendingBookingData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubServices, setSelectedSubServices] = useState([]);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedProviderProfile, setSelectedProviderProfile] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingSlot, setBookingSlot] = useState('');
    const [bookingHouseNo, setBookingHouseNo] = useState('');
    const [bookingArea, setBookingArea] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [bookingCoords, setBookingCoords] = useState(null);
    const [bookingComments, setBookingComments] = useState('');

    const serviceImages = useMemo(() => [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070",
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070",
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070",
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070"
    ], []);

    const getTodayStr = () => new Date().toISOString().split('T')[0];
    const availableSlots = useMemo(() => {
        const slots = [
            { id: '09:00', label: '09:00 AM - 10:00 AM', hour: 9 },
            { id: '10:00', label: '10:00 AM - 11:00 AM', hour: 10 },
            { id: '11:00', label: '11:00 AM - 12:00 PM', hour: 11 },
            { id: '13:00', label: '01:00 PM - 02:00 PM', hour: 13 },
            { id: '15:00', label: '03:00 PM - 04:00 PM', hour: 15 },
            { id: '17:00', label: '05:00 PM - 06:00 PM', hour: 17 },
        ];
        if (bookingDate === getTodayStr()) {
            const currentHour = new Date().getHours();
            return slots.map(s => ({ ...s, isPast: s.hour <= currentHour }));
        }
        return slots.map(s => ({ ...s, isPast: false }));
    }, [bookingDate]);

    useEffect(() => {
        const unsubscribeProviders = onSnapshot(collection(db, 'providers'), (snapshot) => {
            const all = [];
            snapshot.forEach(d => all.push({ id: d.id, ...d.data() }));
            setOnlineProviders(all.filter(p => (p.status === 'active' || p.status === 'approved') && p.isOnline));
        });
        if (userData?.uid) {
            const q = query(collection(db, 'bookings'), or(where('customerUid', '==', userData.uid), where('customerPhone', '==', userData.phone || '')));
            const unsubscribeBookings = onSnapshot(q, (snapshot) => {
                const fetched = [];
                snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));
                const sorted = fetched.sort((a, b) => (b.createdAt?.toMillis || 0) - (a.createdAt?.toMillis || 0));
                setAllMyBookings(sorted);
                setActiveBookings(sorted.filter(b => !['completed', 'rejected', 'cancelled'].includes(String(b.status).toLowerCase())));
                setPastBookings(sorted.filter(b => ['completed', 'rejected', 'cancelled'].includes(String(b.status).toLowerCase())).slice(0, 10));
            });
            return () => { unsubscribeProviders(); unsubscribeBookings(); };
        }
        return () => unsubscribeProviders();
    }, [userData]);

    const handleMyLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const data = await res.json();
                if (data.display_name) {
                    setBookingCoords({ lat: latitude, lon: longitude });
                    setBookingArea(data.display_name.split(',')[0].trim());
                }
            } catch (e) { console.error(e); }
            setIsLocating(false);
        }, () => setIsLocating(false));
    };

    const handleBook = (provider) => {
        const base = Math.min(parseInt(String(provider.price || 149).replace(/\D/g, '')), 199);
        setPendingBookingData({ 
            provider: provider.name,
            providerUid: provider.id,
            price: base,
            service: `${selectedCategory || 'Prime'} Service`,
            subServices: selectedSubServices
        });
        setBookingStep(1);
    };

    const confirmBooking = async (e) => {
        e.preventDefault();
        if (!userData || !pendingBookingData) return;
        setIsSubmitting(true);
        try {
            const booking = {
                service: pendingBookingData.service,
                status: 'pending',
                provider: pendingBookingData.provider,
                providerUid: pendingBookingData.providerUid,
                customer: userData.name || 'Prime Customer',
                customerUid: userData.uid,
                customerPhone: userData.phone || '',
                price: pendingBookingData.price,
                date: bookingDate,
                slot: bookingSlot,
                houseNo: bookingHouseNo,
                area: bookingArea,
                latitude: bookingCoords?.lat || null,
                longitude: bookingCoords?.lon || null,
                comments: bookingComments,
                subServices: pendingBookingData.subServices || [],
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'bookings'), booking);
            if (pendingBookingData.providerUid) sendNotification(pendingBookingData.providerUid, 'New Request', 'You have a new service request!', 'success');
            setBookingStep(2);
            setTimeout(() => setBookingStep(0), 3000);
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    const acceptOffer = async (booking) => {
        try {
            await updateDoc(doc(db, 'bookings', booking.id), { status: 'accepted', price: booking.offerPrice, offerPrice: null });
            sendNotification('admin', 'Offer Accepted', `Accepted for ${booking.service}.`, 'success');
        } catch (e) { console.error(e); }
    };

    const rejectOffer = async (booking) => {
        try {
            await updateDoc(doc(db, 'bookings', booking.id), { status: 'rejected', offerPrice: null });
        } catch (e) { console.error(e); }
    };

    const submitRating = async (booking, rating, testimonial) => {
        if (rating > 0) {
            try {
                await updateDoc(doc(db, 'bookings', booking.id), { rated: true, ratingGiven: rating, testimonial: testimonial || '' });
                alert("Thank you for your feedback!");
            } catch (err) { console.error(err); }
        }
    };

    const displayedProviders = useMemo(() => {
        return onlineProviders.filter(p => {
            if (selectedCategory && !p.category?.includes(selectedCategory)) return false;
            if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [onlineProviders, selectedCategory, searchQuery]);

    return (
        <div className="min-h-screen relative overflow-x-hidden pt-6">
            <div className="fixed inset-0 z-0 pointer-events-none">
                {serviceImages.map((img, idx) => (
                    <div key={idx} className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${idx === currentImageIndex ? 'opacity-20' : 'opacity-0'}`}>
                        <img src={img} alt="Service" className="w-full h-full object-cover" />
                    </div>
                ))}
                <div className="absolute inset-0 bg-linear-to-b from-slate-50 via-slate-100/30 to-slate-200/40"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 flex flex-col gap-10">
                <div className={`relative overflow-hidden rounded-[3rem] shadow-2xl transition-all duration-700 ${!userData?.uid ? 'bg-indigo-950 p-12 text-white' : 'glass-card p-10'}`}>
                    <div className="text-center mb-10">
                        <img src="/primesewa_logo.png" alt="PrimeSewa" className="w-16 h-16 mx-auto mb-6 bg-white p-2 rounded-2xl" />
                        <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic text-slate-950">
                            {userData?.name ? `Hello, ${userData.name.split(' ')[0]}` : 'Premier Service Platform'}
                        </h1>
                    </div>
                    <div className="relative max-w-2xl mx-auto flex items-center bg-white shadow-2xl rounded-[2rem] border p-2">
                        <Search className="w-6 h-6 text-indigo-600 ml-6 mr-4" />
                        <input type="text" placeholder="Search professionals..." className="flex-1 py-4 font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {userData?.uid && bookingStep === 0 && (
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-7 rounded-[2.5rem] flex items-center gap-5 border shadow-sm group hover:scale-[1.02] transition-transform">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                    <Briefcase className="w-7 h-7 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1">Total Services</p>
                                    <h3 className="text-2xl font-black text-slate-900 leading-none">{allMyBookings.length}</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsActivityModalOpen(true)} className="bg-indigo-600 p-7 rounded-[2.5rem] flex items-center gap-5 text-white relative overflow-hidden group shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <Activity className="w-8 h-8 relative z-10" />
                                <div className="relative z-10 text-left">
                                    <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.1em] mb-1">Center</p>
                                    <h3 className="text-2xl font-black italic leading-none">Activity Hub</h3>
                                </div>
                                {activeBookings.length > 0 && (
                                    <span className="ml-auto w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg animate-bounce relative z-10">
                                        {activeBookings.length}
                                    </span>
                                )}
                            </button>
                            <div className="bg-indigo-950 p-7 rounded-[2.5rem] text-white flex items-center gap-5 shadow-xl shadow-indigo-950/20">
                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                                    <Star className="w-8 h-8 text-amber-400 fill-current" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.1em] mb-1">Membership</p>
                                    <h3 className="text-2xl font-black italic leading-none text-amber-400">Prime Member</h3>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Activity & History Block on Dashboard */}
                        {(activeBookings.length > 0 || pastBookings.length > 0) && (
                            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-700 animate-in fade-in zoom-in-95">
                                {/* Dashboard Live Activity Side */}
                                <div className="w-full md:w-5/12 bg-slate-50/70 p-10 border-r border-slate-100">
                                     <div className="flex items-center justify-between mb-8">
                                         <div className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">Live Activity</h3>
                                         </div>
                                         <button onClick={() => setIsActivityModalOpen(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-600 pb-0.5">Control Center</button>
                                     </div>
                                     {activeBookings.length === 0 ? (
                                         <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 py-20">
                                             <Activity className="w-10 h-10 mb-4" />
                                             <p className="text-[11px] font-black uppercase tracking-[0.2em]">No Live Activity</p>
                                         </div>
                                     ) : (
                                         <div className="space-y-6">
                                             {activeBookings.slice(0, 2).map(b => (
                                                 <div key={b.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setIsActivityModalOpen(true)}>
                                                     <div className="flex justify-between items-start mb-4">
                                                         <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-full">{b.status}</div>
                                                         <span className="text-[10px] font-bold text-slate-200">#{b.id.slice(-4).toUpperCase()}</span>
                                                     </div>
                                                     <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-none mb-2">{b.service}</h4>
                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.provider || 'Assigning Hub Partner...'}</p>
                                                 </div>
                                             ))}
                                             {activeBookings.length > 2 && (
                                                 <button onClick={() => setIsActivityModalOpen(true)} className="w-full py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white rounded-2xl border-2 border-dashed border-indigo-50 hover:bg-indigo-50 transition-colors">
                                                     + View {activeBookings.length - 2} More Active
                                                 </button>
                                             )}
                                         </div>
                                     )}
                                </div>
                                {/* Dashboard History Side */}
                                <div className="flex-1 p-10 bg-white">
                                     <div className="flex items-center gap-4 mb-8">
                                         <Clock className="w-6 h-6 text-indigo-600" />
                                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">RECENT HISTORY</h3>
                                     </div>
                                     {pastBookings.length === 0 ? (
                                         <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 py-20">
                                             <Clock className="w-10 h-10 mb-4" />
                                             <p className="text-[11px] font-black uppercase tracking-[0.2em]">History Empty</p>
                                         </div>
                                     ) : (
                                         <div className="grid grid-cols-1 gap-6 w-full">
                                             {pastBookings.slice(0, 3).map(b => (
                                                 <HistoryItem key={b.id} b={b} submitRating={submitRating} />
                                             ))}
                                             <button onClick={() => setIsActivityModalOpen(true)} className="w-full py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-3xl hover:bg-slate-100 transition-colors mt-2">
                                                 Explore Full Service Records
                                             </button>
                                         </div>
                                     )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {bookingStep === 0 && (
                    <div className="space-y-16 pb-20">
                        <div className="space-y-8">
                            <div className="flex justify-between items-end px-4">
                                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Choose a Category</h2>
                                {selectedCategory && <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-600">Reset</button>}
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-4">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex flex-col items-center gap-3 transition-all ${selectedCategory === cat.name ? 'scale-110' : 'opacity-60'}`}>
                                        <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center ${selectedCategory === cat.name ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white border'}`}><cat.icon className="w-7 h-7" /></div>
                                        <span className="text-[9px] font-black uppercase text-center">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedCategory ? (
                             <div className="space-y-12">
                                {/* Sub-services Selection Section */}
                                <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter">Explore {selectedCategory} Services</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select sub-categories to find specialized professionals</p>
                                        </div>
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {categories.find(c => c.name === selectedCategory)?.subServices?.map(sub => (
                                            <button 
                                                key={sub.name}
                                                onClick={() => {
                                                    const exists = selectedSubServices.includes(sub.name);
                                                    setSelectedSubServices(exists ? selectedSubServices.filter(s => s !== sub.name) : [...selectedSubServices, sub.name]);
                                                }}
                                                className={`p-5 rounded-[2rem] border transition-all text-left group ${selectedSubServices.includes(sub.name) ? 'bg-indigo-600 border-indigo-600 shadow-xl' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                            >
                                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedSubServices.includes(sub.name) ? 'text-indigo-200' : 'text-slate-400'}`}>Package</p>
                                                <h4 className={`text-sm font-bold leading-tight ${selectedSubServices.includes(sub.name) ? 'text-white' : 'text-slate-900'}`}>{sub.name}</h4>
                                                <div className="flex items-center gap-1 mt-2">
                                                    <IndianRupee className={`w-3 h-3 ${selectedSubServices.includes(sub.name) ? 'text-white' : 'text-indigo-600'}`} />
                                                    <span className={`text-xs font-black ${selectedSubServices.includes(sub.name) ? 'text-white' : 'text-indigo-600'}`}>Starting ₹{sub.price}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 px-4">
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Available Specialists</p>
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-2 pb-20">
                                    {displayedProviders.map(p => {
                                        // Use consistent base rate logic capped at 199
                                        const rawPrice = parseInt(String(p.price || '149').replace(/\D/g, ''));
                                        const baseRate = Math.min(rawPrice, 199);
                                        const ratingValue = Number(p.rating || 0);
                                        const hasValidRating = ratingValue > 0 && (p.ratingCount || 0) > 0;
                                        
                                        return (
                                            <div key={p.id} onClick={() => setSelectedProviderProfile(p)} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-10 group cursor-pointer hover:scale-[1.03] transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-bl-[8rem] pointer-events-none group-hover:bg-indigo-100/50 transition-colors"></div>
                                                
                                                <div className="flex items-center gap-6 mb-10 relative z-10">
                                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center border shadow-lg group-hover:shadow-indigo-100 transition-all">
                                                        <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600">
                                                            <UserCircle className="w-10 h-10" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-xl font-black text-slate-950 group-hover:text-indigo-600 uppercase italic tracking-tight leading-tight mb-2 transition-colors">{p.name || 'Prime Specialist'}</h4>
                                                        <div className="flex items-center gap-4">
                                                            {hasValidRating && (
                                                                <div className="flex items-center gap-2">
                                                                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                                                                    <span className="text-sm font-black text-slate-900">{ratingValue}</span>
                                                                </div>
                                                            )}
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedProviderProfile(p); }} 
                                                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-600 pb-0.5 hover:text-indigo-800 hover:border-indigo-800 transition-all"
                                                            >
                                                                Profile Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full h-px bg-slate-100 mb-8"></div>

                                                <div className="flex justify-between items-center relative z-10">
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">STARTING AT</p>
                                                        <p className="text-3xl font-black text-slate-950 italic">
                                                            ₹{baseRate}<span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest not-italic">Base Rate</span>
                                                        </p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleBook(p); }} className="px-8 py-4 bg-slate-950 hover:bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                                                        Book Now
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>
                        ) : (
                            <div className="py-24 text-center bg-indigo-50/20 rounded-[4rem] border-2 border-dashed border-indigo-100">
                                <Zap className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
                                <h3 className="text-2xl font-black uppercase italic">Search Ahmedabad's Finest Professionals</h3>
                                <p className="text-slate-400 text-[10px] uppercase font-medium">Please select a category above to continue.</p>
                            </div>
                        )}
                    </div>
                )}

                {bookingStep === 1 && pendingBookingData && (
                    <div className="max-w-4xl bg-white rounded-[3rem] shadow-2xl p-16 mx-auto relative border">
                        <button onClick={() => setBookingStep(0)} className="absolute top-6 right-6 p-2"><XCircle className="w-8 h-8 text-slate-200" /></button>
                        <div className="space-y-12">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Confirm Booking</h2>
                            
                            <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase mb-2">{pendingBookingData.service}</h3>
                                        {pendingBookingData.subServices?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {pendingBookingData.subServices.map(s => (
                                                    <span key={s} className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-300">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-white/40 uppercase mb-1">Total</p>
                                        <p className="text-5xl font-black">₹{pendingBookingData.price}</p>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                                    <p className="text-sm font-bold uppercase italic text-indigo-400">Professional: {pendingBookingData.provider}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                 <div>
                                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Select Schedule</p>
                                     <input required type="date" value={bookingDate} min={getTodayStr()} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-6 bg-slate-50 rounded-3xl font-bold border border-slate-100 outline-none focus:border-indigo-600 transition-all mb-4" />
                                     <div className="grid grid-cols-2 gap-3">
                                        {availableSlots.map(s => (
                                            <button key={s.id} onClick={() => !s.isPast && setBookingSlot(s.id)} className={`py-5 rounded-2xl text-[10px] font-black uppercase transition-all ${s.isPast ? 'opacity-20 cursor-not-allowed' : bookingSlot === s.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white border text-slate-400 hover:border-indigo-200'}`}>{s.label}</button>
                                        ))}
                                     </div>
                                 </div>

                                 <div className="space-y-6">
                                     <div className="flex items-center justify-between">
                                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Service Location</p>
                                         <button 
                                            onClick={handleMyLocation} 
                                            disabled={isLocating}
                                            className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50"
                                         >
                                             {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                             Use My Location
                                         </button>
                                     </div>
                                     <div className="space-y-4">
                                         <input placeholder="House No. / Flat Name" value={bookingHouseNo} onChange={e => setBookingHouseNo(e.target.value)} className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:border-indigo-600 transition-all" />
                                         <input placeholder="Area / Locality / Landmark" value={bookingArea} onChange={e => setBookingArea(e.target.value)} className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:border-indigo-600 transition-all" />
                                     </div>
                                     
                                     {bookingCoords && (
                                         <div className="h-40 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                                             <OSMMap 
                                                latitude={bookingCoords.lat} 
                                                longitude={bookingCoords.lon} 
                                             />
                                         </div>
                                     )}
                                 </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Additional Instructions for Specialist</p>
                                <textarea 
                                    placeholder="Add any specific requirements or landmarks to help the specialist find you..." 
                                    value={bookingComments} 
                                    onChange={e => setBookingComments(e.target.value)} 
                                    className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:border-indigo-600 transition-all min-h-[120px] resize-none"
                                />
                            </div>

                            <button onClick={confirmBooking} disabled={isSubmitting || !bookingSlot || !bookingDate || !bookingArea} className="w-full py-6 bg-slate-900 text-white font-black uppercase text-xs rounded-[2rem] shadow-2xl active:scale-95 disabled:opacity-50 hover:bg-indigo-600 transition-all">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Place Service Request'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isActivityModalOpen && <ActivityOverviewModal activeBookings={activeBookings} pastBookings={pastBookings} submitRating={submitRating} onClose={() => setIsActivityModalOpen(false)} acceptOffer={acceptOffer} rejectOffer={rejectOffer} openTracking={(id) => { setSelectedBooking(id); setIsActivityModalOpen(false); }} />}
            {selectedProviderProfile && <ProviderProfileModal p={selectedProviderProfile} onClose={() => setSelectedProviderProfile(null)} handleBook={handleBook} />}
            {selectedBooking && <BookingDetailsModal bookingId={selectedBooking} onClose={() => setSelectedBooking(null)} sendNotification={sendNotification} />}
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
