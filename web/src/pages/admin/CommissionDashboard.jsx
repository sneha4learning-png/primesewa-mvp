import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CommissionDashboard = () => {
    const [commissions, setCommissions] = useState([]);
    const [totalCommission, setTotalCommission] = useState(0);
    const [timeRange, setTimeRange] = useState('All');
    const [chartData, setChartData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [payouts, setPayouts] = useState([]);
    const [activeTab, setActiveTab] = useState('Commissions');
    const itemsPerPage = 8;

    useEffect(() => {
        // Real-time listener — commission records update instantly when bookings change
        const unsubscribe = onSnapshot(collection(db, 'bookings'), (bookSnap) => {
            try {
                const allRecords = [];

                bookSnap.docs.forEach(d => {
                    const b = { id: d.id, ...d.data() };
                    if (b.status === 'completed') {
                        const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                        const amount = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;
                        // Use the booking's scheduled date to remain consistent with other dashboards
                        const dateStr = b.date || (b.completedAt?.toDate ? b.completedAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                        // Precise timestamp for sorting — prefer completedAt, then createdAt, then date string
                        const ts = b.completedAt?.toMillis?.() || (b.completedAt?.seconds ?? 0) * 1000
                            || b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000
                            || new Date(b.date || 0).getTime();

                        allRecords.push({
                            id: b.id,
                            bookingId: b.id,
                            provider: b.provider || 'Unknown',
                            service: b.service || '—',
                            customer: b.customer || '—',
                            amount: amount,
                            commission: parseFloat((amount * 0.15).toFixed(2)),
                            providerEarning: parseFloat((amount * 0.85).toFixed(2)),
                            date: dateStr,
                            _ts: ts  // used for sorting only
                        });
                    }
                });

                // Apply time filter
                let filtered = allRecords;
                if (timeRange === '7days') {
                    const limit = new Date();
                    limit.setDate(limit.getDate() - 7);
                    limit.setHours(0, 0, 0, 0);
                    filtered = allRecords.filter(c => new Date(c.date) >= limit);
                } else if (timeRange === 'thisMonth') {
                    const now = new Date();
                    filtered = allRecords.filter(c => {
                        const d = new Date(c.date);
                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    });
                }

                // Sort by timestamp descending — newest record at top
                const sorted = [...filtered].sort((a, b) => b._ts - a._ts);
                setCommissions(sorted);
                setTotalCommission(sorted.reduce((acc, curr) => acc + (curr.commission || 0), 0));

                // Analytics data processing — process records into a daily trend for the chart
                const dailyTrend = new Map();
                // Initialize last 7 days including today
                for(let i=6; i>=0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const ds = d.toISOString().split('T')[0];
                    dailyTrend.set(ds, { date: ds, label: d.toLocaleDateString('en-US', { weekday: 'short' }), earnings: 0 });
                }

                sorted.forEach(c => {
                    if (dailyTrend.has(c.date)) {
                        const existing = dailyTrend.get(c.date);
                        existing.earnings += c.commission;
                    }
                });
                setChartData(Array.from(dailyTrend.values()));
            } catch (err) {
                console.error('Error processing commissions:', err);
            }
        }, (err) => {
            console.error('Commission listener error:', err);
        });

        const unsubscribePayouts = onSnapshot(collection(db, 'payouts'), (paySnap) => {
            const allPay = paySnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.scheduledFor?.toMillis?.() || 0) - (a.scheduledFor?.toMillis?.() || 0));
            setPayouts(allPay);
        });

        return () => { unsubscribe(); unsubscribePayouts(); };
    }, [timeRange]);

    const markAsPaid = async (payoutId) => {
        if (!window.confirm('Mark this payout as paid? The provider will be notified.')) return;
        try {
            const ref = doc(db, 'payouts', payoutId);
            await updateDoc(ref, { status: 'paid', paidAt: serverTimestamp() });
            alert('Payout processed successfully!');
        } catch (e) { 
            console.error('Payout update failed:', e); 
            alert('Failed to process payout: ' + e.message);
        }
    };

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
            <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab('Commissions')} className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'Commissions' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    Commissions
                    {activeTab === 'Commissions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-full" />}
                </button>
                <button onClick={() => setActiveTab('Payouts')} className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'Payouts' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    Provider Payouts
                    {activeTab === 'Payouts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-full" />}
                </button>
            </div>

            {activeTab === 'Commissions' ? (
                <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-normal text-gray-800">Platform Commissions</h2>
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
                    <p className="text-4xl font-normal tracking-tight">₹{totalCommission.toFixed(0)}</p>
                    <p className="text-emerald-100 mt-2 text-sm">For the selected period</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-sm font-normal text-gray-500 mb-2">Jobs Completed</p>
                    <p className="text-3xl font-normal text-gray-900">{commissions.length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-sm font-normal text-gray-500 mb-2">Total Job Value</p>
                    <p className="text-3xl font-normal text-gray-900">
                        ₹{commissions.reduce((a, c) => a + (c.amount || 0), 0).toFixed(0)}
                    </p>
                </div>
            </div>


            {/* Analytics Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" /> Earnings Trend (Last 7 Days)
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-normal text-slate-400 uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" /> Platform Cut: 15%
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontWeight: 'bold', color: '#10b981' }}
                                formatter={(value) => [`₹${value.toFixed(2)}`, 'Platform Earning']}
                            />
                            <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#10b981'} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div id="commission-table" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-normal text-gray-800">Commission Records</h3>
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-normal px-3 py-1 rounded-full border border-emerald-100">
                        {commissions.length} record{commissions.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {/* Desktop Table */}
                    <table className="hidden md:table w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{c.service || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 text-right">₹{c.amount.toFixed(0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-emerald-600 text-right">+ ₹{c.commission.toFixed(0)}</td>
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

                    {/* Mobile Card List */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {paginatedRecords.map(c => (
                            <div key={c.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-end mb-2">
                                    <span className="text-xs text-gray-500">{c.date}</span>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-normal text-gray-900 text-sm">{c.service || '—'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{c.provider}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm text-gray-600 font-medium">₹{c.amount}</p>
                                        <p className="text-sm font-normal text-emerald-600">+₹{c.commission}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {paginatedRecords.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">No completed jobs in the selected period.</div>
                        )}
                    </div>
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
                            className={`px-4 py-2 border rounded-lg text-sm font-normal transition-all ${currentPage === 1 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 border rounded-lg text-sm font-normal transition-all ${currentPage === totalPages ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Pending Disbursements</p>
                            <p className="text-3xl font-normal text-amber-600">₹{payouts.filter(p => p.status === 'pending').reduce((a, c) => a + (c.amount || 0), 0).toFixed(0)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Total Paid Out</p>
                            <p className="text-3xl font-normal text-emerald-600">₹{payouts.filter(p => p.status === 'paid').reduce((a, c) => a + (c.amount || 0), 0).toFixed(0)}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-200">
                                    <th className="px-6 py-4 font-medium">Scheduled Date</th>
                                    <th className="px-6 py-4 font-medium">Provider</th>
                                    <th className="px-6 py-4 font-medium">Service</th>
                                    <th className="px-6 py-4 font-medium text-right">Net Amount</th>
                                    <th className="px-6 py-4 font-medium text-center">Status</th>
                                    <th className="px-6 py-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-normal">
                                            {p.scheduledFor?.toDate ? p.scheduledFor.toDate().toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{p.providerName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{p.service}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">₹{p.amount?.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.status === 'pending' && (
                                                <button onClick={() => markAsPaid(p.id)} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all">
                                                    Process Payment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payouts.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-slate-400 text-sm font-normal">No payout records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommissionDashboard;
