import { useState, useEffect } from 'react';
import { Filter, Search, Calendar, ChevronDown, X, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import TimelineModal from '../../components/TimelineModal';

// BUG-6: Review Timeline Modal


const BookingMonitoring = () => {
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
        const fetchBookings = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'bookings'));
                const allBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // CRITICAL: Apply 5-completed-job-per-provider cap for consistency with dashboard
                const completedCounts = new Map();
                const filtered = [];
                // Sort by date/createdAt to keep the first 5 chronologically
                const sorted = allBookings.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

                sorted.forEach(b => {
                    if (b.status === 'completed') {
                        const count = completedCounts.get(b.provider) || 0;
                        if (count < 5) {
                            filtered.push(b);
                            completedCounts.set(b.provider, count + 1);
                        }
                    } else {
                        filtered.push(b);
                    }
                });

                setBookings(filtered.reverse());
            } catch (err) {
                console.error("Error fetching bookings:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const filteredBookings = bookings.filter(b => {
        const matchesStatus = filterStatus === 'All' || b.status === filterStatus.toLowerCase();
        const matchesCategory = filterCategory === 'All' || (b.service || '').toLowerCase().includes(filterCategory.toLowerCase());
        const matchesProvider = (b.provider || '').toLowerCase().includes(filterProvider.toLowerCase());
        const matchesDate = filterDate === 'All' || (b.date || '').toLowerCase().includes(filterDate.toLowerCase());
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
            case 'negotiating': return 'bg-purple-100 text-purple-800 border-purple-200';
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-medium">Booking ID</th>
                                <th className="px-6 py-4 font-medium">Date & Service</th>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Provider</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedBookings.map(booking => (
                                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{booking.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{booking.service}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" /> {booking.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{booking.customer}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{booking.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{booking.proposedPrice || booking.price || booking.amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold capitalize ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => setTimelineBooking(booking)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline underline-offset-2 transition-colors"
                                        >
                                            Review Timeline
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedBookings.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <Search className="w-8 h-8 text-gray-300" />
                                        </div>
                                        {isLoading ? 'Loading bookings...' : 'No bookings found for the selected filter.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
