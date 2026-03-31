
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Calendar, Clock, MapPin, IndianRupee, ShieldCheck, Phone, CheckCircle2, XCircle, AlertCircle, Loader2, Truck, Zap } from 'lucide-react';
import OSMMap from '../../components/OSMMap';

export default function BookingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!id) return;
        const unsub = onSnapshot(doc(db, 'bookings', id), (docSnap) => {
            if (docSnap.exists()) {
                setBooking({ id: docSnap.id, ...docSnap.data() });
            }
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="text-center">
                <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-slate-900">Booking Not Found</h2>
                <button onClick={() => navigate('/dashboard')} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-950 transition-all">Back to Dashboard</button>
            </div>
        </div>
    );

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
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

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-2xl mx-auto px-6 pt-10">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-8 group">
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-xs font-black uppercase tracking-widest leading-none pt-0.5">Dashboard</span>
                </button>

                <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 overflow-hidden">
                    {/* STATUS HEADER */}
                    <div className="p-8 sm:p-12 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">Booking Summary</p>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{booking.service}</h1>
                            </div>
                            <div className={`px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                                {booking.status}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-12 space-y-12">
                        {/* SERVICE INFO GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date & Time
                                    </label>
                                    <p className="text-sm font-bold text-slate-700">{booking.date} at {formatTime(booking.slot)}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Service Location
                                    </label>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                        {(booking.houseNo && booking.area) 
                                            ? `${booking.houseNo}, ${booking.area}` 
                                            : (booking.address || 'Address details being retrieved...')}
                                    </p>
                                    {/* VISUAL MAP: ADDED PER REQUEST */}
                                    <div className="mt-4 w-full h-32 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative group">
                                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
                                        <OSMMap 
                                            houseNo={booking.houseNo} 
                                            area={booking.area} 
                                            address={booking.address} 
                                            latitude={booking.latitude} 
                                            longitude={booking.longitude} 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Total Payment</label>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">₹{booking.price}</p>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Pay After Service
                                    </p>
                                </div>
                                <div className="space-y-1 pt-4 border-t border-slate-200/50">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Expected Duration</span>
                                    <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-indigo-500" /> 45 - 60 Minutes
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* PROVIDER INFO */}
                        <div className="space-y-6 border-t border-slate-100 pt-12">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Assigned Specialist</h3>
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl font-black text-slate-200 shadow-inner group-hover:rotate-3 transition-transform overflow-hidden border border-slate-100">
                                        {(() => {
                                            const pName = booking.provider || booking.providerName;
                                            const hasProvider = pName && pName.toLowerCase() !== 'unassigned';
                                            return hasProvider ? pName.charAt(0).toUpperCase() : <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />;
                                        })()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                            {(() => {
                                                const pName = booking.provider || booking.providerName;
                                                const hasProvider = pName && pName.toLowerCase() !== 'unassigned';
                                                return hasProvider ? pName : (booking.providerUid ? `Expert #${booking.providerUid.slice(-4).toUpperCase()}` : 'Assigning Expert...');
                                            })()}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                            {((booking.provider || booking.providerName) && (booking.provider || booking.providerName).toLowerCase() !== 'unassigned') 
                                                ? 'Verified Expert' 
                                                : 'Searching for your professional'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { if (booking.providerPhone) window.location.href = `tel:${booking.providerPhone}`; else alert('Phone number not available'); }}
                                        className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all border border-slate-100 hover:border-indigo-100"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LIVE JOURNEY TRACKING - CUSTOMER SIDE */}
                        {['accepted', 'arrived', 'enroute', 'inprogress', 'completed'].includes(String(booking.status).toLowerCase()) && (
                           <div className="mt-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                               <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-8 text-center relative z-10">Live Journey Tracking</h4>
                               <div className="relative flex justify-between max-w-sm mx-auto">
                                   <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0"></div>
                                   {[
                                       { key: 'enroute', label: 'On Way', icon: Truck },
                                       { key: 'arrived', label: 'At Door', icon: MapPin },
                                       { key: 'inprogress', label: 'Working', icon: Zap }
                                   ].map((s, idx) => {
                                       const statusOrder = { 'enroute': 1, 'arrived': 2, 'inprogress': 3 };
                                       const currentLevel = booking.trackingStatus ? (statusOrder[booking.trackingStatus] || 0) : (booking.status === 'completed' ? 3 : 0);
                                       const thisLevel = statusOrder[s.key];
                                       const isDone = currentLevel >= thisLevel;
                                       const isCurrent = booking.trackingStatus === s.key;

                                       return (
                                           <div key={s.key} className="relative z-10 flex flex-col items-center gap-3">
                                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${isDone ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 rotate-3' : 'bg-white border-slate-100 text-slate-300'}`}>
                                                   <s.icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                                               </div>
                                               <span className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-indigo-600' : 'text-slate-400'}`}>{s.label}</span>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                        )}

                        {/* DESCRIPTION */}
                        {booking.description && (
                            <div className="space-y-3 border-t border-slate-100 pt-12">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Specific Instructions</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed italic bg-indigo-50/20 p-6 rounded-2xl border border-indigo-50">
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
            </div>
        </div>
    );
}
