import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const CommissionDashboard = () => {
    const [commissions, setCommissions] = useState([]);
    const [totalCommission, setTotalCommission] = useState(0);
    const [timeRange, setTimeRange] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchCommissions = async () => {
            try {
                // 1. Fetch explicitly written commission records
                const commSnap = await getDocs(collection(db, 'commissions'));
                const dbCommissions = commSnap.docs.map(d => ({ id: d.id, source: 'commissions', ...d.data() }));

                // 2. Fetch completed bookings and derive commission records for any
                //    that don't already have an entry in the commissions collection
                const bookSnap = await getDocs(collection(db, 'bookings'));
                const rawBookings = bookSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Group by provider and keep only 5 completed
                const completedCounts = new Map();
                const filteredCompleted = [];

                // Sort by date/createdAt to get strictly first 5
                const sortedAll = rawBookings.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

                sortedAll.forEach(b => {
                    if (b.status === 'completed') {
                        const count = completedCounts.get(b.provider) || 0;
                        if (count < 5) {
                            filteredCompleted.push(b);
                            completedCounts.set(b.provider, count + 1);
                        }
                    }
                });

                const completedBookings = filteredCompleted;

                // Build a set of booking IDs already tracked in commissions
                const trackedBookingIds = new Set(dbCommissions.map(c => c.bookingId));

                // For untracked completed bookings, generate a synthetic commission record
                const derivedCommissions = completedBookings
                    .filter(b => !trackedBookingIds.has(b.id))
                    .map(b => {
                        const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                        const amount = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                        return {
                            id: `derived-${b.id}`,
                            bookingId: b.id,
                            provider: b.provider || 'Unknown',
                            amount: amount,
                            commission: parseFloat((amount * 0.15).toFixed(2)),
                            providerEarning: parseFloat((amount * 0.85).toFixed(2)),
                            service: b.service,
                            customer: b.customer,
                            date: b.date || new Date().toISOString().split('T')[0],
                            source: 'derived'
                        };
                    });

                // Merge both sources
                const rawAllRecords = [...dbCommissions, ...derivedCommissions];

                // CRITICAL FIX: Ensure the 5-job-per-provider cap is applied to ALL displayed records
                const recordsByProvider = new Map();
                const cappedRecords = [];

                // Sort by date to ensure we pick the first 5 chronologically
                const sortedRecords = rawAllRecords.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

                sortedRecords.forEach(c => {
                    const provider = c.provider || 'Unknown';
                    const count = recordsByProvider.get(provider) || 0;
                    if (count < 5) {
                        cappedRecords.push(c);
                        recordsByProvider.set(provider, count + 1);
                    }
                });

                const allRecords = cappedRecords;

                // Apply time filter
                const today = new Date();
                let filtered = allRecords;
                if (timeRange === '7days') {
                    const limit = new Date();
                    limit.setDate(limit.getDate() - 7);
                    filtered = allRecords.filter(c => new Date(c.date) >= limit);
                } else if (timeRange === 'thisMonth') {
                    filtered = allRecords.filter(c => {
                        const d = new Date(c.date);
                        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                    });
                }

                // Sort by newest first
                const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
                setCommissions(sorted);
                setTotalCommission(sorted.reduce((acc, curr) => acc + (curr.commission || 0), 0));
            } catch (err) {
                console.error('Error fetching commissions:', err);
            }
        };

        fetchCommissions();
    }, [timeRange]);

    // Pagination logic
    const totalPages = Math.ceil(commissions.length / itemsPerPage);
    const paginatedRecords = commissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [timeRange]);

    const handleExportCSV = () => {
        if (commissions.length === 0) return alert('No data to export');
        const headers = ['Record ID', 'Booking ID', 'Date', 'Provider', 'Job Amount', 'Platform Cut (15%)'];
        const csvRows = commissions.map(c =>
            `${c.id},${c.bookingId},${c.date},"${c.provider}",${c.amount},${c.commission}`
        );
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `commissions_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Platform Commissions</h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700"
                        >
                            <option value="All">All Time</option>
                            <option value="thisMonth">This Month</option>
                            <option value="7days">Last 7 Days</option>
                        </select>
                        <Filter className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-all">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-500/30">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-emerald-50">Total Revenue (15%)</h3>
                    </div>
                    <p className="text-4xl font-bold tracking-tight">₹{totalCommission.toFixed(2)}</p>
                    <p className="text-emerald-100 mt-2 text-sm">For the selected period</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-sm font-semibold text-gray-500 mb-2">Jobs Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{commissions.length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-sm font-semibold text-gray-500 mb-2">Total Job Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                        ₹{commissions.reduce((a, c) => a + (c.amount || 0), 0).toFixed(0)}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Commission Records</h3>
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-100">
                        {commissions.length} record{commissions.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-medium">Booking ID</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Service</th>
                                <th className="px-6 py-4 font-medium">Provider</th>
                                <th className="px-6 py-4 font-medium text-right">Job Amount</th>
                                <th className="px-6 py-4 font-medium text-right text-emerald-600">Platform Cut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedRecords.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-blue-600 font-mono">{c.bookingId?.slice(0, 12)}…</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{c.service || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 text-right">₹{c.amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">+ ₹{c.commission}</td>
                                </tr>
                            ))}
                            {paginatedRecords.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 text-sm">
                                        No completed jobs in the selected period.
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
                        Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, commissions.length)}</span> of <span className="text-gray-900">{commissions.length}</span> records
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

export default CommissionDashboard;
