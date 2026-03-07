import { X, Clock, CheckCircle2, XCircle } from 'lucide-react';

const TimelineModal = ({ booking, onClose }) => {
    if (!booking) return null;
    const isFailed = ['rejected', 'cancelled'].includes(booking.status);

    const steps = [
        { label: 'Booking Created', status: 'done', time: booking.date ? `${booking.date} ${booking.time || ''}` : 'N/A' },
        { label: 'Provider Assigned', status: booking.status !== 'pending' ? 'done' : 'pending', time: booking.status !== 'pending' ? `${booking.provider} • ${booking.date} ${booking.time || ''}` : 'Awaiting Assignment' },
        { label: 'Negotiation', status: booking.status === 'negotiating' ? 'active' : (booking.proposedPrice ? (isFailed && booking.status === 'rejected' ? 'failed' : 'done') : 'skip'), time: booking.proposedPrice ? `Agreed ₹${booking.proposedPrice} • ${booking.date} ${booking.time || ''}` : 'No negotiation needed' },
        { label: 'Job Accepted', status: ['accepted', 'completed'].includes(booking.status) ? 'done' : (isFailed ? 'failed' : (booking.status === 'pending' || booking.status === 'negotiating' ? 'pending' : 'skip')), time: ['accepted', 'completed'].includes(booking.status) ? `${booking.provider} • ${booking.date} ${booking.time || ''}` : (isFailed ? 'Declined/Cancelled' : 'Awaiting acceptance') },
        { label: 'Job Completed', status: booking.status === 'completed' ? 'done' : (isFailed ? 'skip' : 'pending'), time: booking.status === 'completed' ? `₹${booking.proposedPrice || booking.price} • ${booking.date} ${booking.time || ''}` : 'Pending completion' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
                    <h3 className="text-xl font-black">Booking Journey</h3>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">#{booking.id.slice(0, 8)} · {booking.service}</p>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="p-8 space-y-2">
                    {steps.filter(s => s.status !== 'skip').map((step, i) => (
                        <div key={i} className="flex gap-5 items-start">
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${step.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    step.status === 'active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' :
                                        step.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            'bg-slate-50 text-slate-300 border-slate-100'
                                    }`}>
                                    {step.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> :
                                        step.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                                            step.status === 'active' ? <Clock className="w-5 h-5" /> :
                                                <Clock className="w-5 h-5" />}
                                </div>
                                {i < steps.filter(s => s.status !== 'skip').length - 1 && (
                                    <div className={`w-0.5 h-10 my-1 rounded-full ${step.status === 'done' ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                                )}
                            </div>
                            <div className="pt-1">
                                <p className={`font-black text-sm ${step.status === 'done' ? 'text-slate-900' :
                                    step.status === 'active' ? 'text-indigo-600' :
                                        step.status === 'failed' ? 'text-rose-600' :
                                            'text-slate-400'
                                    }`}>
                                    {step.label}
                                </p>
                                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">{step.time}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Status</p>
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize border ${booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            booking.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                booking.status === 'cancelled' || booking.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{booking.status}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-xl font-black text-slate-900 leading-none">₹{booking.proposedPrice || booking.price || booking.amount || '—'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelineModal;
