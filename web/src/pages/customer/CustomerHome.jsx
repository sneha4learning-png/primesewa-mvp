// PRIME SEWA DEPLOYMENT TRIGGER: RELIABLE BUILD 2026-04-03-T13:00
import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { createPortal } from 'react-dom';
import OSMMap from '../../components/OSMMap';

import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp, onSnapshot, or } from 'firebase/firestore';
import { Search, MapPin, Star, Wrench, Zap, Droplets, Sparkles, CheckCircle2, IndianRupee, Calendar, Clock as ClockIcon, XCircle, Phone, ShieldCheck, Loader2, Filter, Briefcase, Plus as PlusIcon, UserCircle, Hammer, Paintbrush, Wind, Monitor, Scissors, Bug, PieChart as PieChartIcon, AlertCircle, Truck, ArrowRight, TrendingUp, Activity, Clock, Info, Navigation } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line } from 'recharts';

// Helper component for visual history trend (Pie Chart Mode)
const HistoryChart = ({ bookings }) => {
    const data = useMemo(() => {
        const catMap = {};
        bookings.filter(b => b.status === 'completed').forEach(b => {
            const cat = b.service?.split('(')[0]?.trim() || 'Other';
            catMap[cat] = (catMap[cat] || 0) + 1;
        });
        return Object.entries(catMap).map(([name, value]) => ({ name, value })).slice(0, 5);
    }, [bookings]);

    const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

    if (data.length === 0) return null;

    return (
        <div className="h-32 w-full mb-6 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontStyle: 'italic', fontWeight: '900' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 pr-4">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate w-16">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
    if (cat.includes('plumb')) return "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80";
    if (cat.includes('electri')) return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80";
    if (cat.includes('clean')) return "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80";
    if (cat.includes('carpent')) return "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80";
    if (cat.includes('salon') || cat.includes('beauty')) return "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80";
    if (cat.includes('ac')) return "https://images.unsplash.com/photo-1621905252507-b352175d2f24?w=800&q=80";
    if (cat.includes('paint')) return "https://images.unsplash.com/photo-1589939705384-5185138a04b9?w=800&q=80";
    if (cat.includes('pest')) return "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=800&q=80";
    if (cat.includes('mover') || cat.includes('pack')) return "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80";
    if (cat.includes('appliance')) return "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80";
    if (cat.includes('handyman') || cat.includes('repair')) return "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=800&q=80";
    return "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"; // Professional House/Modern Interior Fallback
};

const ProviderProfileModal = ({ p, onClose, handleBook, selectedSubServices = [], categoryData }) => {
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

    const rawPrice = parseInt(price.replace(/\D/g, '') || '0') || 0;
    const baseRate = Math.min(rawPrice > 0 ? rawPrice : 149, 199);
    let subtotalSum = 0;
    if (categoryData && selectedSubServices.length > 0) {
        selectedSubServices.forEach(sName => {
            const subObj = categoryData.subServices?.find(ss => ss.name === sName);
            if (subObj) {
                // Provider-specific variance based on ID for demo purposes, or actual subServicePrices if available
                const variance = (parseInt(String(p.id || '').slice(-3), 16) || 0) % 15 * 5 - 35;
                const providerPrice = p.subServicePrices?.[sName] || Math.max(subObj.price + variance, 49);
                subtotalSum += providerPrice;
            }
        });
    }
    const currentTotalDisplay = baseRate + subtotalSum;

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
                    <div className="flex justify-between items-start mb-8">
                        <div className="pt-2">
                            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">{name}</h2>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-full tracking-widest border border-indigo-100">{category}</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full tracking-widest border border-emerald-100 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Prime Verified</span>
                            </div>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <button onClick={() => { const phone = String(p.phone || ''); if (!phone) { alert('Contact details unavailable.'); return; } window.location.href = `tel:${phone}`; }} className="w-12 h-12 bg-white text-emerald-600 rounded-2xl border-2 border-emerald-50 transition-all flex items-center justify-center hover:bg-emerald-50 hover:scale-110 active:scale-95 shadow-sm">
                                <Phone className="w-6 h-6 border-none" />
                            </button>
                            <button onClick={() => { handleBook(p); onClose(); }} className="px-8 py-4 bg-indigo-600 hover:bg-slate-950 text-white font-black rounded-2xl text-[11px] uppercase shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 tracking-[0.2em]">Book Professional</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-10">
                        <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-amber-500/5 group/stat">
                            <Star className="w-6 h-6 text-amber-500 mx-auto mb-3 fill-current group-hover/stat:rotate-12 transition-transform" />
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                                {(liveJobsCount > 0 && ratingValue > 0 && (p.ratingCount || 0) > 0) ? ratingValue.toFixed(1) : 'NEW'}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">Specialist Rating</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 group/stat">
                            <Briefcase className="w-6 h-6 text-indigo-500 mx-auto mb-3 group-hover/stat:scale-110 transition-transform" />
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                                {liveJobsCount > 0 ? liveJobsCount : '0'}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">Completed Jobs</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 group/stat">
                            <IndianRupee className="w-6 h-6 text-emerald-500 mx-auto mb-3 group-hover/stat:animate-bounce" />
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tighter">
                                ₹{currentTotalDisplay > 0 ? currentTotalDisplay : Math.min(parseInt(String(price).replace(/\D/g, '') || '0'), 199)}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">{subtotalSum > 0 ? 'Total Value' : 'Starting From'}</div>
                        </div>
                    </div>

                    {/* Sub Services Highlight */}
                    <div className="mb-6 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-indigo-500" /> Package Details
                        </h3>
                        {selectedSubServices.length > 0 ? (
                            <div className="flex flex-col gap-2.5">
                                <div className="flex justify-between items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                    <span>Standard Base Package Active</span>
                                    <span>₹{baseRate}</span>
                                </div>
                                {selectedSubServices.map(sName => {
                                    const subObj = categoryData?.subServices?.find(ss => ss.name === sName);
                                    const variance = (parseInt(String(p.id || '').slice(-3), 16) || 0) % 15 * 5 - 35;
                                    const subPrice = p.subServicePrices?.[sName] || Math.max((subObj?.price || 0) + variance, 49);
                                    return (
                                        <div key={sName} className="flex justify-between items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                                            <span>{sName}</span>
                                            <span>₹{subPrice}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] animate-pulse font-black text-indigo-600 uppercase tracking-widest">Base cost will apply if you will not select any sub service</span>
                            </div>
                        )}
                    </div>

                    {portfolio.length > 0 && (
                        <div className="mb-6 animate-in slide-in-from-bottom-4 duration-1000">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-indigo-500" /> Professional Portfolio
                            </h3>
                            <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                {portfolio.filter(Boolean).map((img, i) => (
                                    <div key={i} className="shrink-0 snap-start group/work first:ml-0">
                                        <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-lg">
                                            <img src={String(img)} onError={(e) => { e.target.onerror = null; e.target.src = getServiceImage(category); }} className="w-64 h-48 object-cover transition-transform duration-700 group-hover/work:scale-115" alt="Work Sample" />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover/work:opacity-100 transition-opacity flex items-end p-6">
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest">Verified Work</span>
                                            </div>
                                        </div>
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
    const [activeTab, setActiveTab] = useState(activeBookings.length > 0 ? 'live' : 'history');

    return createPortal(
        <div className="fixed inset-0 z-[100000] bg-indigo-950/60 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8" onClick={onClose}>
            <div className="bg-slate-50 w-full max-w-6xl h-full max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="bg-white px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Activity Hub</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Live tracking and member service history</p>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded-[2rem] flex items-center gap-1 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('live')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-xl translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex items-center gap-2">
                                {activeBookings.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></div>}
                                Live Tracking
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Service Records
                        </button>
                    </div>

                    <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-[2rem] text-slate-400 transition-all active:scale-95 shrink-0 hidden md:block">
                        <XCircle className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* LIVE ACTIVITY VIEW */}
                    <div className={`absolute inset-0 transition-all duration-700 p-8 flex flex-col ${activeTab === 'live' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Active Bookings</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar-indigo">
                            {activeBookings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                    <Activity className="w-12 h-12 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">No Live Activity Found</p>
                                    <button onClick={() => setActiveTab('history')} className="mt-6 text-[9px] font-black text-indigo-600 uppercase border-b-2 border-indigo-600 pb-1">View Recent History instead</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeBookings.map(b => (
                                        <div key={b.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-500 group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-widest">{b.status}</div>
                                                <span className="text-[10px] font-bold text-slate-300">#{b.id.slice(-4).toUpperCase()}</span>
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none mb-3 group-hover:text-indigo-600 transition-colors">{b.service}</h4>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{b.provider || 'Assigning Hub Partner...'}</p>

                                            {(b.status?.toLowerCase() === 'negotiating') && (b.proposedPrice || b.offerPrice) && (
                                                <div className="mt-8 p-6 bg-slate-950 rounded-[2rem] border border-white/10 text-white italic shadow-2xl">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Counter Offer</p>
                                                        <p className="text-3xl font-black">₹{b.proposedPrice || b.offerPrice}</p>
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
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HISTORY VIEW */}
                    <div className={`absolute inset-0 transition-all duration-700 p-8 flex flex-col ${activeTab === 'history' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <Clock className="w-6 h-6 text-indigo-600" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Service History</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-indigo">
                            <div className="space-y-6">
                            {pastBookings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                    <Clock className="w-12 h-12 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">History is Empty</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                                    {pastBookings.map(b => (
                                        <HistoryItem key={b.id} b={b} submitRating={submitRating} />
                                    ))}
                                </div>
                            )}
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
                <div className="p-10 space-y-10">
                    {/* Real-time Tracking Stepper */}
                    {['accepted', 'inprogress', 'arrived', 'enroute'].includes(booking.status?.toLowerCase()) && (
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Progress</h3>
                            </div>
                            
                            <div className="relative flex justify-between">
                                {/* Connector Line */}
                                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                                <div 
                                    className="absolute top-5 left-0 h-0.5 bg-indigo-500 transition-all duration-1000 -z-0"
                                    style={{ 
                                        width: booking.trackingStatus === 'inprogress' ? '100%' : 
                                               booking.trackingStatus === 'arrived' ? '66%' : 
                                               booking.trackingStatus === 'enroute' ? '33%' : '0%' 
                                    }}
                                ></div>

                                {[
                                    { key: 'enroute', label: 'En-Route', icon: Navigation },
                                    { key: 'arrived', label: 'Arrived', icon: MapPin },
                                    { key: 'inprogress', label: 'Working', icon: Zap }
                                ].map((s) => {
                                    const statusOrder = { 'enroute': 1, 'arrived': 2, 'inprogress': 3 };
                                    const currentLevel = booking.trackingStatus ? statusOrder[booking.trackingStatus] || 0 : 0;
                                    const thisLevel = statusOrder[s.key];
                                    const isActive = currentLevel >= thisLevel;
                                    const isCurrent = booking.trackingStatus === s.key;

                                    return (
                                        <div key={s.key} className="relative z-10 flex flex-col items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 border-white shadow-xl ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                <s.icon className={`w-4 h-4 ${isCurrent ? 'animate-bounce' : ''}`} />
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>{s.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {booking.trackingStatus && (
                                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Update</p>
                                        <p className="text-xs font-bold text-slate-700">
                                            {booking.trackingStatus === 'enroute' && 'Your specialist is on the way to your location.'}
                                            {booking.trackingStatus === 'arrived' && 'The professional has arrived at your doorstep.'}
                                            {booking.trackingStatus === 'inprogress' && 'The service is currently being performed.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Service Expert</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                    <UserCircle className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{booking.provider || 'Assigning...'}</h4>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Booking ID</p>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">#{booking.id.slice(-8).toUpperCase()}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Schedule Detail</p>
                            <div className="flex items-center gap-3 text-slate-900">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <p className="text-sm font-black uppercase tracking-tight">{booking.date} at {formatTime(booking.slot || booking.time)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Financial Summary</p>
                            <p className="text-3xl font-black text-indigo-600 italic tracking-tighter">₹{booking.price}</p>
                        </div>
                    </div>

                    {booking.address && (
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                            <div className="flex items-start gap-4 mb-4">
                                <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                                <div>
                                    <p className="text-[9px] text-indigo-300/50 font-black uppercase tracking-widest mb-1">Service Destination</p>
                                    <p className="text-sm font-medium leading-relaxed">{booking.address}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const CustomerHome = () => {
    const { userData } = useAuth();
    const { sendNotification } = useNotifications();
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
    const [minRating, setMinRating] = useState(0);
    const [areaSuggestions, setAreaSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const areaDebounceRef = useRef(null);


    const serviceImages = [
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=2070", // Plumbing
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070", // Electrical
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070", // Cleaning
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070", // Carpentry
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070", // Salon
        "https://images.unsplash.com/photo-1621905252507-b352175d2f24?q=80&w=2070", // AC Repair
        "https://images.unsplash.com/photo-1589939705384-5185138a04b9?q=80&w=2070", // Painting
        "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?q=80&w=2070", // Packers & Movers
        "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?q=80&w=2070", // Pest Control
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070", // Appliance Repair
        "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?q=80&w=2070"  // Handyman
    ];

    const activeBackgroundImage = useMemo(() => {
        return serviceImages[currentImageIndex];
    }, [currentImageIndex, serviceImages]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % serviceImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [serviceImages.length]);

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

    const handleCategorySelect = (catName) => {
        if (selectedCategory !== catName) {
            setSelectedCategory(catName);
            setSelectedSubServices([]); // Only reset if switching categories
        }
    };

    const [locationError, setLocationError] = useState('');

    const handleMyLocation = () => {
        // Geolocation only works on HTTPS or localhost
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        setLocationError('');

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,       // 10 second limit — never hangs silently
            maximumAge: 60000     // Accept a cached position up to 1 min old
        };

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    if (!res.ok) throw new Error('Nominatim error');
                    const data = await res.json();

                    // Build a clean readable address from structured fields
                    const addr = data.address || {};
                    const parts = [
                        addr.road || addr.pedestrian || addr.footway,
                        addr.neighbourhood || addr.suburb || addr.quarter,
                        addr.city || addr.town || addr.village || addr.county
                    ].filter(Boolean);

                    const readableArea = parts.length > 0
                        ? parts.join(', ')
                        : (data.display_name?.split(',').slice(0, 3).join(',').trim() || 'Location detected');

                    setBookingCoords({ lat: latitude, lon: longitude });
                    setBookingArea(readableArea);
                } catch (e) {
                    console.error('Reverse geocode failed:', e);
                    setLocationError('Could not get address. Please type it manually.');
                } finally {
                    setIsLocating(false);
                }
            },
            (err) => {
                setIsLocating(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setLocationError('Location access denied. Please allow location in browser settings.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable. Please type your area manually.');
                        break;
                    case err.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError('Could not detect location. Please type manually.');
                }
            },
            options
        );
    };

    const handleBook = (provider) => {
        console.log('Final Selection to Modal:', { cat: selectedCategory, sub: selectedSubServices });
        const base = Math.min(parseInt(String(provider.price || 149).replace(/\D/g, '')) || 149, 199);

        // Calculate sub-services total if any selected
        const categoryData = categories.find(c => c.name === selectedCategory);
        let subtotal = 0;
        if (categoryData && selectedSubServices.length > 0) {
            selectedSubServices.forEach(sName => {
                const sub = categoryData.subServices?.find(ss => ss.name === sName);
                if (sub) subtotal += sub.price;
            });
        }

        // Final price logic: Base + Sub-services (if any)
        const finalPrice = base + subtotal;

        setPendingBookingData({
            provider: provider.name,
            providerUid: provider.id,
            price: finalPrice,
            service: `${selectedCategory || 'Prime'} Service`,
            subServices: [...selectedSubServices],
            baseRate: base,
            subtotalSum: subtotal
        });
        setBookingStep(1);
    };

    const toggleSubServiceInReview = (subName) => {
        const nextSubServices = selectedSubServices.includes(subName)
            ? selectedSubServices.filter(s => s !== subName)
            : [...selectedSubServices, subName];

        setSelectedSubServices(nextSubServices);

        if (pendingBookingData) {
            let subtotal = 0;
            const categoryData = categories.find(c => c.name === selectedCategory);
            if (categoryData && nextSubServices.length > 0) {
                nextSubServices.forEach(sName => {
                    const sub = categoryData.subServices?.find(ss => ss.name === sName);
                    if (sub) subtotal += sub.price;
                });
            }
            setPendingBookingData(prev => ({
                ...prev,
                subServices: nextSubServices,
                subtotalSum: subtotal,
                price: (prev.baseRate || 199) + subtotal
            }));
        }
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
        const finalPrice = booking.proposedPrice || booking.offerPrice || booking.price;
        try {
            await updateDoc(doc(db, 'bookings', booking.id), { 
                status: 'accepted', 
                price: finalPrice, 
                proposedPrice: null,
                offerPrice: null 
            });
            sendNotification('admin', 'Offer Accepted', `Accepted for ${booking.service}.`, 'success');
        } catch (e) { console.error(e); }
    };

    const rejectOffer = async (booking) => {
        try {
            await updateDoc(doc(db, 'bookings', booking.id), { status: 'rejected', proposedPrice: null, offerPrice: null });
        } catch (e) { console.error(e); }
    };

    const submitRating = async (booking, rating, testimonial) => {
        if (rating > 0) {
            try {
                await updateDoc(doc(db, 'bookings', booking.id), { rated: true, ratingGiven: rating, testimonial: testimonial || '' });

                if (booking.provider) {
                    const q = query(collection(db, 'providers'), where('name', '==', booking.provider));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const providerDoc = querySnapshot.docs[0];
                        const providerData = providerDoc.data();
                        const currentCount = providerData.ratingCount || 0;
                        const currentRating = providerData.rating || 0;
                        const newCount = currentCount + 1;
                        const newRating = ((currentRating * currentCount) + rating) / newCount;

                        await updateDoc(doc(db, 'providers', providerDoc.id), {
                            rating: newRating,
                            ratingCount: newCount
                        });
                    }
                }

                alert("Thank you for your feedback!");
            } catch (err) { console.error(err); }
        }
    };

    const displayedProviders = useMemo(() => {
        return onlineProviders.filter(p => {
            if (selectedCategory && !p.category?.includes(selectedCategory)) return false;
            if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (minRating > 0 && (p.rating || 0) < minRating) return false;
            return true;
        }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [onlineProviders, selectedCategory, searchQuery, minRating]);

    return (
        <div className="min-h-screen relative overflow-x-hidden pt-6">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out">
                    <img src={activeBackgroundImage} alt="Service" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/60 via-slate-50/95 to-white"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 flex flex-col gap-6">
                <div id="top" className={`relative overflow-hidden rounded-[2rem] shadow-xl transition-all duration-700 scroll-mt-28 ${!userData?.uid ? 'brand-gradient p-8 text-white border border-white/10' : 'bg-white/80 backdrop-blur-xl p-6 border border-white shadow-slate-200/50'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <img src="/primesewa_logo.png" alt="PrimeSewa" className="w-10 h-10 bg-white p-2 rounded-xl shadow-md ring-1 ring-slate-100/50" />
                            <div className="text-left">
                                <h1 className={`text-xl md:text-2xl font-extrabold tracking-tight leading-none ${!userData?.uid ? 'text-white' : 'text-slate-900'}`}>
                                    {userData?.name ? `Hello, ${userData.name.split(' ')[0]}` : 'Premier Service Platform'}
                                </h1>
                                <p className={`mt-1 text-xs font-bold tracking-widest uppercase ${!userData?.uid ? 'text-emerald-200' : 'text-teal-600/80'}`}>Ahmedabad's Elite Home Service Network</p>
                            </div>
                        </div>
                        <div className={`relative flex-1 max-w-md w-full flex items-center shadow-sm rounded-xl border transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 duration-300 ${!userData?.uid ? 'bg-white/10 border-white/10' : 'bg-white border-slate-200 focus-within:border-indigo-300 hover:border-indigo-200'}`}>
                            <Search className={`w-4 h-4 ml-4 mr-2 ${!userData?.uid ? 'text-indigo-400' : 'text-indigo-500'}`} />
                            <input type="text" placeholder="Search services..." className={`flex-1 py-2.5 pr-4 font-semibold outline-none bg-transparent text-xs ${!userData?.uid ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                </div>

                {userData?.uid && bookingStep === 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-3xl flex items-center gap-4 border border-slate-100 shadow-xl shadow-slate-200/20 group hover:scale-[1.02] transition-all hover:bg-slate-50">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-lg transition-all">
                                    <Briefcase className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Total Services</p>
                                    <h3 className="text-xl font-black text-slate-900 leading-none">{allMyBookings.length}</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsActivityModalOpen(true)} className="bg-indigo-600 p-5 rounded-3xl flex items-center gap-4 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all outline-none">
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                                    <Activity className="w-6 h-6 text-white relative z-10" />
                                </div>
                                <div className="relative z-10 text-left flex-1">
                                    <p className="text-indigo-200 text-xs uppercase font-black tracking-widest mb-1">Live Status</p>
                                    <h3 className="text-xl font-black italic leading-none">Activity Hub</h3>
                                </div>
                                {activeBookings.length > 0 && (
                                    <span className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce relative z-10">
                                        {activeBookings.length}
                                    </span>
                                )}
                            </button>
                            <div className="bg-indigo-950 p-5 rounded-3xl text-white flex items-center gap-4 shadow-2xl shadow-indigo-950/20 hover:bg-black transition-colors group">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-all">
                                    <Star className="w-6 h-6 text-amber-400 fill-current" />
                                </div>
                                <div>
                                    <p className="text-indigo-300 text-xs uppercase font-black tracking-widest mb-1">Membership</p>
                                    <h3 className="text-xl font-black italic leading-none text-amber-400">Prime Member</h3>
                                </div>
                            </div>
                        </div>

                        {/* Distinct Dashboard Activity Blocks */}
                        {(activeBookings.length > 0 || pastBookings.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700">
                                {/* Dashboard Live Activity Card */}
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 hover:shadow-indigo-500/5 transition-all overflow-hidden relative">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Active Service</h3>
                                        </div>
                                        <button onClick={() => setIsActivityModalOpen(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">Full View</button>
                                    </div>
                                    {activeBookings.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                                            <Activity className="w-10 h-10 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No Active Bookings</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {activeBookings.slice(0, 1).map(b => (
                                                <div key={b.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => setIsActivityModalOpen(true)}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="px-3 py-1 bg-white text-indigo-600 text-[9px] font-black uppercase rounded-full shadow-sm">{b.status}</div>
                                                        <span className="text-[10px] font-bold text-slate-200 group-hover:text-indigo-200">#ACTIVE</span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-slate-950 uppercase tracking-tight leading-none mb-2">{b.service}</h4>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.provider || 'Assigning Expert...'}</p>
                                                        {(b.status?.toLowerCase() === 'negotiating') && (b.proposedPrice || b.offerPrice) && (
                                                            <div className="text-right">
                                                                <p className="text-xs font-black text-indigo-600 leading-none">₹{b.proposedPrice || b.offerPrice}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {activeBookings.length > 1 && (
                                                <button onClick={() => setIsActivityModalOpen(true)} className="w-full py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-100 hover:border-indigo-300 transition-all">
                                                    + {activeBookings.length - 1} More Activity
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Dashboard Analytics & History Card */}
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 hover:shadow-indigo-500/5 transition-all flex flex-col">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Clock className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Spending Hub</h3>
                                    </div>
                                    {pastBookings.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 flex-1">
                                            <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-200 mb-4 flex items-center justify-center">
                                                <PieChartIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Analytics Ready After First Job</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col">
                                            <HistoryChart bookings={pastBookings} />
                                            <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                                                    <p className="text-xl font-black text-slate-900">₹{pastBookings.reduce((sum, b) => sum + (typeof b.price === 'number' ? b.price : parseInt((b.price || '0').toString().replace(/[₹,]/g, '')) || 0), 0)}</p>
                                                </div>
                                                <button onClick={() => setIsActivityModalOpen(true)} className="flex items-center gap-2 py-3 px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10">
                                                    Full History <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {bookingStep === 0 && (
                    <div className="space-y-6 pb-20">
                        <div id="service-catalog" className="space-y-4 scroll-mt-28">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-lg font-black tracking-tighter uppercase italic">Choose Category</h2>
                                {selectedCategory && <button onClick={() => setSelectedCategory(null)} className="text-[9px] font-black text-indigo-600 uppercase border-b-2 border-indigo-600">Reset</button>}
                            </div>
                            <div className="flex overflow-x-auto pb-4 gap-4 hide-scrollbar snap-x px-2">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => handleCategorySelect(cat.name)} className={`flex flex-col items-center gap-2 transition-all group snap-start ${selectedCategory === cat.name ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedCategory === cat.name ? 'bg-indigo-600 text-white shadow-lg rotate-3' : 'bg-white border hover:border-indigo-200'}`}>
                                            <cat.icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-xs font-black uppercase text-center leading-tight tracking-wide whitespace-nowrap py-1 ${selectedCategory === cat.name ? 'text-teal-600' : 'text-slate-800'}`}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedCategory ? (
                             <div className="space-y-6">
                                {/* Sub-services Selection Section */}
                                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-5 border border-white/20 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-sm font-black text-indigo-950 uppercase italic tracking-tighter">{selectedCategory} Packages</h3>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">Select options for price comparison</p>
                                        </div>
                                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar snap-x">
                                        {/* Base Plate Highlighter */}
                                        <div className={`shrink-0 w-32 p-3 rounded-2xl border transition-all text-left snap-start ${selectedSubServices.length === 0 ? 'bg-indigo-600 border-indigo-600 shadow-lg' : 'bg-white border-slate-100'}`}>
                                            <p className={`text-xs font-black uppercase tracking-wide mb-1 ${selectedSubServices.length === 0 ? 'text-indigo-200' : 'text-slate-600'}`}>Standard</p>
                                            <h4 className={`text-sm font-bold leading-tight ${selectedSubServices.length === 0 ? 'text-white' : 'text-slate-900'}`}>Base Rate</h4>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className={`text-xs font-black ${selectedSubServices.length === 0 ? 'text-white' : 'text-slate-500'}`}>INCLUDED</span>
                                            </div>
                                        </div>

                                        {categories.find(c => c.name === selectedCategory)?.subServices?.map(sub => (
                                            <button
                                                key={sub.name}
                                                onClick={() => {
                                                    const next = selectedSubServices.includes(sub.name)
                                                        ? selectedSubServices.filter(s => s !== sub.name)
                                                        : [...selectedSubServices, sub.name];
                                                    setSelectedSubServices(next);
                                                }}
                                                className={`shrink-0 w-32 p-3 rounded-2xl border transition-all text-left snap-start group ${selectedSubServices.includes(sub.name) ? 'bg-indigo-600 border-indigo-600 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                            >
                                                <p className={`text-xs font-black uppercase tracking-wide mb-1 ${selectedSubServices.includes(sub.name) ? 'text-emerald-200' : 'text-slate-600'}`}>+ Service</p>
                                                <h4 className={`text-sm font-bold leading-tight ${selectedSubServices.includes(sub.name) ? 'text-white' : 'text-slate-900'}`}>{sub.name}</h4>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className={`text-sm font-black ${selectedSubServices.includes(sub.name) ? 'text-white' : 'text-teal-600'}`}>₹{sub.price}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-6 px-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                        <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Available Specialists</p>
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm">
                                        <Filter className="w-4 h-4 text-indigo-500" />
                                        <div className="flex gap-2">
                                            {[0, 4.5, 4.0, 3.0].map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => setMinRating(val)}
                                                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${minRating === val ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    {val === 0 ? 'All' : `${val}+ Stars`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2 pb-10">
                                    {displayedProviders.map(p => {
                                        const rawPrice = parseInt(String(p.price || '149').replace(/\D/g, '')) || 149;
                                        const baseRate = Math.min(rawPrice, 199);
                                        const categoryData = categories.find(c => c.name === selectedCategory);
                                        let subtotalSum = 0;
                                        if (categoryData && selectedSubServices.length > 0) {
                                            selectedSubServices.forEach(sName => {
                                                const subObj = categoryData.subServices?.find(ss => ss.name === sName);
                                                if (subObj) {
                                                    const variance = (parseInt(String(p.id || '').slice(-3), 16) || 0) % 15 * 5 - 35;
                                                    const providerPrice = p.subServicePrices?.[sName] || Math.max(subObj.price + variance, 49);
                                                    subtotalSum += providerPrice;
                                                }
                                            });
                                        }

                                        const currentTotalDisplay = baseRate + subtotalSum;
                                        const ratingValue = Number(p.rating || 0);
                                        const hasValidRating = ratingValue > 0 && (p.ratingCount || 0) > 0;
                                        
                                        return (
                                            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-md p-4 group hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between border-b-2 hover:border-b-indigo-500">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedProviderProfile(p); }}
                                                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all z-20"
                                                    title="View Full Profile & Reviews"
                                                >
                                                    <Info size={14} />
                                                </button>
                                                <div className="relative z-10 flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                                                        <UserCircle className="w-7 h-7 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-black text-slate-900 truncate uppercase leading-none mb-1">{p.name || 'Specialist'}</h4>
                                                        <div className="flex items-center gap-1.5">
                                                            <Star className="w-2 h-2 text-amber-500 fill-current" />
                                                            <span className="text-xs font-black text-slate-700">{hasValidRating ? ratingValue.toFixed(1) : 'NEW'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between pt-2 border-t border-slate-50">
                                                    <div>
                                                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">Total Cost</p>
                                                        <p className="text-base font-black text-slate-900">₹{currentTotalDisplay}</p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleBook(p); }} className="h-7 px-3 brand-gradient text-white rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                                        Book
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-indigo-50/20 rounded-[3rem] border-2 border-dashed border-indigo-100">
                                <Zap className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Search Ahmedabad's Elite Pros</h3>
                                <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Select a category to start comparing pricing</p>
                            </div>
                        )}

                        {/* Testimonials Section */}
                        <div className="mt-10 pt-6">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Testimonials</p>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">Loved by Ahmedabad</h2>
                                </div>
                                <div className="text-right hidden md:block">
                                    <div className="flex -space-x-2 justify-end mb-1 filter drop-shadow-md">
                                        <img className="w-8 h-8 rounded-full border-2 border-white relative z-40 object-cover shadow-sm" src="/testimonials/anjali.png" alt="Anjali" />
                                        <img className="w-8 h-8 rounded-full border-2 border-white relative z-30 object-cover shadow-sm" src="/testimonials/vikram.png" alt="Vikram" />
                                        <img className="w-8 h-8 rounded-full border-2 border-white relative z-20 object-cover shadow-sm" src="/testimonials/sneha.png" alt="Sneha" />
                                        <div className="w-8 h-8 rounded-full border-2 border-white relative z-10 bg-indigo-600 flex items-center justify-center text-white text-[8px] font-black shadow-sm overflow-hidden">
                                            +82
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-900 leading-none text-right">4.8 / 5.0 Rating</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Card 1 */}
                                <div className="bg-blue-50/20 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col justify-between hover:shadow-xl hover:bg-white transition-all duration-500 group">
                                    <div>
                                        <div className="flex gap-1 mb-6 text-amber-500">
                                            <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                                        </div>
                                        <p className="text-slate-600 font-medium italic text-sm leading-relaxed mb-8">
                                            "The expert was highly professional and arrived right on time. Essential for my family functions!"
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <img src="/testimonials/anjali.png" alt="Anjali Patel" className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-slate-100" />
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 leading-none mb-1">Anjali Patel</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                                Verified Homeowner • Satellite,<br />Ahmedabad
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2 */}
                                <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:bg-white transition-all duration-500 group">
                                    <div>
                                        <div className="flex gap-1 mb-6 text-amber-500">
                                            <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                                        </div>
                                        <p className="text-slate-600 font-medium italic text-sm leading-relaxed mb-8">
                                            "Extremely convenient booking process. The pricing was fair and the technician spoke Gujarati, which was very helpful."
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <img src="/testimonials/vikram.png" alt="Vikram Shah" className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-slate-100" />
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 leading-none mb-1">Vikram Shah</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                                Verified Client • Maninagar,<br />Ahmedabad
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3 */}
                                <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:bg-white transition-all duration-500 group">
                                    <div>
                                        <div className="flex gap-1 mb-6 text-amber-500">
                                            <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                                        </div>
                                        <p className="text-slate-600 font-medium italic text-sm leading-relaxed mb-8">
                                            "Finally a reliable service in Ahmedabad! The team is local and highly trustworthy."
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <img src="/testimonials/sneha.png" alt="Sneha Jhaveri" className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-slate-100" />
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 leading-none mb-1">Sneha Jhaveri</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                                Verified Resident • Ambawadi,<br />Ahmedabad
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {bookingStep === 1 && pendingBookingData && (
                <div className="max-w-2xl bg-white rounded-3xl shadow-2xl p-6 mx-auto relative border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
                    <button onClick={() => setBookingStep(0)} className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"><XCircle className="w-5 h-5 text-slate-300" /></button>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 italic">Review Your Booking</h2>
                                    {pendingBookingData.subServices?.length === 0 ? (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                            Standard Base Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[7px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                                            {pendingBookingData.subServices.length} Selected
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finalize your service request</p>
                            </div>
                        </div>

                        <div className="brand-gradient p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors duration-1000"></div>
                            <div className="relative z-10">
                                <div className="gap-x-8 flex flex-wrap lg:flex-nowrap justify-between items-start mb-4">
                                    <div className="w-full lg:w-3/5">
                                        <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Service Package</p>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{pendingBookingData.service}</h3>
                                        {pendingBookingData.subServices?.length > 0 ? (
                                            <div className="flex flex-col gap-2 mt-4 mb-4">
                                                <div className="flex justify-between items-center px-4 py-2 bg-emerald-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 shadow-md">
                                                    <span>Standard Base Package Active</span>
                                                    <span>₹{pendingBookingData.baseRate || 199}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 mb-4 flex">
                                                <span className="px-4 py-2 bg-emerald-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 shadow-md animate-pulse">
                                                    Base cost will apply if no sub service
                                                </span>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Customize Package</p>
                                            <div className="flex flex-col gap-2">
                                                {categories.find(c => c.name === selectedCategory)?.subServices?.map(sub => {
                                                    const isSelected = pendingBookingData.subServices?.includes(sub.name);
                                                    return (
                                                        <button
                                                            key={sub.name}
                                                            onClick={(e) => { e.preventDefault(); toggleSubServiceInReview(sub.name); }}
                                                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group ${isSelected ? 'bg-indigo-500/20 border-indigo-500/50 shadow-sm' : 'bg-white/5 border-white/10 hover:border-indigo-400/50 hover:bg-white/10'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400' : 'border-white/30'}`}>
                                                                    {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                </div>
                                                                <span className={`text-xs font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-300'}`}>{sub.name}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-300' : 'text-white/40'}`}>+ ₹{sub.price}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right mt-4 lg:mt-0 w-full lg:w-auto">
                                        <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.2em] mb-1">Total</p>
                                        <p className="text-4xl font-black text-white italic leading-none">₹{pendingBookingData.price}</p>
                                        {pendingBookingData.subServices?.length > 0 && (
                                            <div className="mt-1 text-right">
                                                <p className="text-white/50 text-[8px] font-black uppercase tracking-widest">
                                                    Base: ₹{pendingBookingData.baseRate} + Add: ₹{pendingBookingData.subtotalSum}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/5">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                                            <UserCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-[8px] uppercase font-black tracking-widest">Selected Expert</p>
                                            <p className="text-sm font-black uppercase tracking-tight text-white">{pendingBookingData.provider}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">
                                        <ShieldCheck className="w-5 h-5" /> Secured by PrimeSewa
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Select Schedule</p>
                                <input required type="date" value={bookingDate} min={getTodayStr()} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-indigo-600 transition-all mb-3 text-slate-700" />
                                <div className="grid grid-cols-2 gap-2">
                                    {availableSlots.map(s => (
                                        <button key={s.id} onClick={() => !s.isPast && setBookingSlot(s.id)} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${s.isPast ? 'opacity-20 cursor-not-allowed' : bookingSlot === s.id ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white border text-slate-400 hover:border-indigo-200 hover:bg-slate-50'}`}>{s.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Service Location</p>
                                    <button
                                        onClick={handleMyLocation}
                                        disabled={isLocating}
                                        className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50"
                                    >
                                        {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                        Use My Location
                                    </button>
                                </div>
                                {locationError && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                                        <span className="text-rose-500 text-lg">⚠️</span>
                                        <p className="text-xs font-semibold text-rose-600">{locationError}</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <input
                                        placeholder="House/Flat No."
                                        value={bookingHouseNo}
                                        onChange={e => setBookingHouseNo(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-teal-500 transition-all text-xs"
                                    />
                                    {/* Area/Locality with OSM autocomplete */}
                                    <div className="relative">
                                        <div className="relative">
                                            <input
                                                placeholder="Type area or locality..."
                                                value={bookingArea}
                                                autoComplete="off"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setBookingArea(val);
                                                    setBookingCoords(null); // clear stale pin
                                                    setShowSuggestions(true);
                                                    clearTimeout(areaDebounceRef.current);
                                                    if (val.length < 3) { setAreaSuggestions([]); return; }
                                                    areaDebounceRef.current = setTimeout(async () => {
                                                        setIsFetchingSuggestions(true);
                                                        try {
                                                            const res = await fetch(
                                                                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=6&countrycodes=in`,
                                                                { headers: { 'Accept-Language': 'en' } }
                                                            );
                                                            const results = await res.json();
                                                            setAreaSuggestions(results);
                                                        } catch { setAreaSuggestions([]); }
                                                        setIsFetchingSuggestions(false);
                                                    }, 400);
                                                }}
                                                onFocus={() => bookingArea.length >= 3 && setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                className="w-full p-2.5 pr-8 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-teal-500 transition-all text-xs"
                                            />
                                            {isFetchingSuggestions && (
                                                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500 animate-spin" />
                                            )}
                                        </div>
                                        {showSuggestions && areaSuggestions.length > 0 && (
                                            <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200/60 overflow-hidden max-h-52 overflow-y-auto">
                                                {areaSuggestions.map((s, i) => {
                                                    const addr = s.address || {};
                                                    const label = [
                                                        addr.road || addr.neighbourhood || addr.suburb,
                                                        addr.city || addr.town || addr.village || addr.county,
                                                        addr.state
                                                    ].filter(Boolean).join(', ') || s.display_name?.split(',').slice(0,3).join(',').trim();
                                                    return (
                                                        <li
                                                            key={i}
                                                            onMouseDown={() => {
                                                                setBookingArea(label);
                                                                setBookingCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
                                                                setAreaSuggestions([]);
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-teal-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                                                            <span className="text-xs text-slate-700 leading-snug">{label}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {bookingCoords && (
                                    <div className="h-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <OSMMap
                                            latitude={bookingCoords.lat}
                                            longitude={bookingCoords.lon}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Additional Instructions</p>
                            <textarea
                                placeholder="Add any specific requirements..."
                                value={bookingComments}
                                onChange={e => setBookingComments(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-indigo-600 transition-all min-h-[60px] resize-none text-sm"
                            />
                        </div>

                        <button onClick={confirmBooking} disabled={isSubmitting || !bookingSlot || !bookingDate || !bookingArea} className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs rounded-xl shadow-xl active:scale-95 disabled:opacity-50 hover:bg-indigo-600 transition-all">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Place Service Request'}
                        </button>
                    </div>
                </div>
            )}
        </div>

            { isActivityModalOpen && <ActivityOverviewModal activeBookings={activeBookings} pastBookings={pastBookings} submitRating={submitRating} onClose={() => setIsActivityModalOpen(false)} acceptOffer={acceptOffer} rejectOffer={rejectOffer} openTracking={(id) => { setSelectedBooking(id); setIsActivityModalOpen(false); }} /> }
    { selectedProviderProfile && <ProviderProfileModal p={selectedProviderProfile} onClose={() => setSelectedProviderProfile(null)} handleBook={handleBook} selectedSubServices={selectedSubServices} categoryData={categories.find(c => c.name === selectedCategory)} /> }
    { selectedBooking && <BookingDetailsModal bookingId={selectedBooking} onClose={() => setSelectedBooking(null)} /> }
        </div >
    );
};

export default function CustomerHomeWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <CustomerHome />
        </ErrorBoundary>
    );
}
