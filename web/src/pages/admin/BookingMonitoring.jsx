import { useState, useEffect } from 'react';
import { Filter, Search, Calendar, ChevronDown, X, Clock, CheckCircle2, Loader2, Star } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, getDocs, writeBatch } from 'firebase/firestore';
import TimelineModal from '../../components/TimelineModal';
import { useNotifications } from '../../context/NotificationContext';

// BUG-6: Review Timeline Modal


const BookingMonitoring = () => {
    const { sendNotification } = useNotifications();
    const [bookings, setBookings] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDate, setFilterDate] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterProvider, setFilterProvider] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [timelineBooking, setTimelineBooking] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        setIsLoading(true);

        // Real-time listener — new bookings appear instantly without page refresh
        const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filteredAll = allBookings;

            // Sort by createdAt timestamp descending — newest booking appears first
            const sorted = filteredAll.sort((a, b) => {
                const tsA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000 || new Date(a.date || 0).getTime();
                const tsB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000 || new Date(b.date || 0).getTime();
                return tsB - tsA; // descending: newest first
            });

            // SORT BY CREATED AT TIMESTAMP DESCENDING: Newest bookings appear at the top
            setBookings(sorted);
            setIsLoading(false);
        }, (err) => {
            console.error('Bookings listener error:', err);
            setIsLoading(false);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
    };

    const filteredBookings = bookings.filter(b => {
        const matchesStatus = filterStatus === 'All' || b.status === filterStatus.toLowerCase();
        const matchesCategory = filterCategory === 'All' || (b.service || '').toLowerCase().includes(filterCategory.toLowerCase());
        const matchesProvider = (b.provider || '').toLowerCase().includes(filterProvider.toLowerCase());

        // Fix Date Filtering Logic
        let matchesDate = filterDate === 'All';
        if (filterDate !== 'All') {
            const today = new Date();
            const targetDate = new Date();
            if (filterDate === 'Yesterday') targetDate.setDate(today.getDate() - 1);
            else if (filterDate === 'Tomorrow') targetDate.setDate(today.getDate() + 1);
            else if (filterDate === 'Today') { /* targetDate is already today */ }

            // Use local date string YYYY-MM-DD instead of UTC to avoid timezone shifts
            const offset = targetDate.getTimezoneOffset();
            const localDate = new Date(targetDate.getTime() - (offset * 60 * 1000));
            const targetDateStr = localDate.toISOString().split('T')[0];
            matchesDate = (b.date || '').includes(targetDateStr);
        }

        return matchesStatus && matchesCategory && matchesProvider && matchesDate;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterDate, filterCategory, filterProvider]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'cancelled': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'rejected': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'negotiating': return 'bg-purple-100 text-purple-700 border-purple-200'; // Fixed purple color consistency
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* BUG-6: Timeline Modal */}
            {timelineBooking && <TimelineModal booking={timelineBooking} onClose={() => setTimelineBooking(null)} />}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Booking Monitor</h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                        >
                            <option value="All">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="negotiating">Negotiating</option>
                            <option value="accepted">Accepted</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                        onClick={async () => {
                            if (!window.confirm("⚠️ SMARK REPAIR: Attempting to recover missing specialist names for 'Unassigned' bookings?")) return;
                            setIsLoading(true);
                            try {
                                const providersSnap = await getDocs(collection(db, 'providers'));
                                const bookingsSnap = await getDocs(collection(db, 'bookings'));
                                const batch = writeBatch(db);
                                
                                let repaired = 0;
                                bookingsSnap.forEach(d => {
                                    const b = d.data();
                                    const currentName = b.provider || b.providerName || '';
                                    if (!currentName || currentName.toLowerCase() === 'unassigned') {
                                        // Find best match by category
                                        const match = providersSnap.docs.find(pd => pd.data().category === b.category);
                                        if (match) {
                                            const m = match.data();
                                            batch.update(doc(db, 'bookings', d.id), {
                                                provider: m.name,
                                                providerName: m.name,
                                                providerUid: match.id,
                                                providerPhone: m.phone || ''
                                            });

                                            // NOTIFY: NEWLY ASSIGNED PROVIDER
                                            if (typeof sendNotification === 'function') {
                                                sendNotification(match.id, 'New Assignment (Repair)', `Admin has assigned you to a pending ${b.service} request.`, 'success');
                                                // Also notify customer if we have their UID
                                                if (b.customerUid) {
                                                    sendNotification(b.customerUid, 'Expert Assigned', `Admin has matched you with ${m.name} for your ${b.service} request.`, 'info');
                                                }
                                            }
                                            repaired++;
                                        }
                                    }
                                });
                                await batch.commit();
                                alert(`✅ REPAIR COMPLETE! Restored details for ${repaired} bookings.`);
                            } catch (e) { alert("❌ Error: " + e.message); }
                            finally { setIsLoading(false); }
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors"
                    >
                        <Clock className="w-4 h-4" /> Smart Repair
                    </button>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${showAdvanced ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'}`}
                    >
                        <Filter className="w-4 h-4" /> Advanced
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvanced && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Service Category</label>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="All">All Categories</option>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Carpentry">Carpentry</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Provider Name</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search by provider..." value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date Filter</label>
                        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="All">Any Time</option>
                            <option value="Today">Today</option>
                            <option value="Yesterday">Yesterday</option>
                            <option value="Tomorrow">Tomorrow</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {/* Desktop Table View */}
                    <table className="hidden lg:table w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="px-3 py-4 font-medium">Date & Service</th>
                                <th className="px-3 py-4 font-medium">Customer</th>
                                <th className="px-3 py-4 font-medium">Provider</th>
                                <th className="px-3 py-4 font-medium">Amount</th>
                                <th className="px-3 py-4 font-medium">Status</th>
                                <th className="px-3 py-4 font-medium">Rating</th>
                                <th className="px-3 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedBookings.map(booking => (
                                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{booking.service}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" /> {booking.date} • {booking.slot || (booking.time && formatTime(booking.time))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{booking.customer || 'Unknown'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{booking.provider || booking.providerName || booking.expert || 'Unassigned'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{booking.price || booking.proposedPrice || booking.amount || '0'}</td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold capitalize ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {booking.ratingGiven ? (
                                            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 w-fit">
                                                <Star size={14} className="fill-current" />
                                                {Number(booking.ratingGiven).toFixed(1)}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 font-medium tracking-widest">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => setTimelineBooking(booking)}
                                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100 shadow-sm"
                                            title="Review Timeline"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="lg:hidden divide-y divide-gray-100">
                        {paginatedBookings.map(booking => (
                            <div key={booking.id} className="p-4 space-y-3">
                                <div className="flex justify-end items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(booking.status)}`}>
                                        {booking.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{booking.service}</div>
                                        <div className="text-xs text-gray-500">{booking.date} • {booking.slot || formatTime(booking.time)} • ₹{booking.price || booking.proposedPrice || booking.amount}</div>
                                        {booking.ratingGiven && (
                                            <div className="flex items-center gap-1.5 text-amber-500 font-black text-[10px] mt-1.5">
                                                <Star size={10} className="fill-current" /> {Number(booking.ratingGiven).toFixed(1)} RATING
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setTimelineBooking(booking)}
                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-50">
                                    <div>Cust: <span className="font-semibold text-gray-800">{booking.customer || 'N/A'}</span></div>
                                    <div>Pro: <span className="font-semibold text-gray-800">{booking.provider || booking.providerName || 'Unassigned'}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {paginatedBookings.length === 0 && (
                        <div className="px-6 py-12 text-center text-gray-500">
                            <div className="flex justify-center mb-2">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            {isLoading ? 'Loading bookings...' : 'No bookings found.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-xl shadow-sm mt-4">
                    <div className="text-sm text-gray-500 font-medium">
                        Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredBookings.length)}</span> of <span className="text-gray-900">{filteredBookings.length}</span> results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 border rounded-lg text-sm font-bold transition-all ${currentPage === 1 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 border rounded-lg text-sm font-bold transition-all ${currentPage === totalPages ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingMonitoring;
