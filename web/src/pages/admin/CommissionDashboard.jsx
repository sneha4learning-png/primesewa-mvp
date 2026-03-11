import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

const CommissionDashboard = () => {
    const [commissions, setCommissions] = useState([]);
    const [totalCommission, setTotalCommission] = useState(0);
    const [monthlyData, setMonthlyData] = useState([]);
    const [timeRange, setTimeRange] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
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

                // Process Monthly Data for Analytics
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthlyMap = {};
                
                allRecords.forEach(rec => {
                    const d = new Date(rec.date);
                    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                    if (!monthlyMap[key]) {
                        monthlyMap[key] = { month: key, commission: 0, jobs: 0, sortKey: d.getFullYear() * 100 + d.getMonth() };
                    }
                    monthlyMap[key].commission += rec.commission;
                    monthlyMap[key].jobs += 1;
                });

                const analytics = Object.values(monthlyMap)
                    .sort((a, b) => a.sortKey - b.sortKey)
                    .map(item => ({
                        ...item,
                        commission: Math.round(item.commission) // Enforce clean integers for analytics
                    }))
                    .slice(-6); // Last 6 months
                
                setMonthlyData(analytics);
            } catch (err) {
                console.error('Error processing commissions:', err);
            }
        }, (err) => {
            console.error('Commission listener error:', err);
        });

        return () => unsubscribe();
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
                    <p className="text-4xl font-bold tracking-tight">₹{totalCommission.toFixed(0)}</p>
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

            {/* Analytics Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Commission Growth
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Monthly revenue performance breakdown</p>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase">Live Data</span>
                        </div>
                    </div>
                    <div className="h-[280px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData} margin={{ top: 10, right: 35, left: 10, bottom: 30 }}>
                                <defs>
                                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                                    tickFormatter={(value) => `₹${value}`}
                                />
                                <Tooltip 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                                    cursor={{stroke: '#10b981', strokeWidth: 2}}
                                    formatter={(value) => [`₹${Math.round(value)}`, 'Commission']}
                                />
                                <Area 
                                    type="natural" 
                                    dataKey="commission" 
                                    stroke="#059669" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorComm)" 
                                    dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                   <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" /> Monthly Summary
                        </h3>
                        <div className="space-y-4">
                            {monthlyData.slice().reverse().map((data, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">{data.month}</span>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">₹{data.commission.toFixed(0)}</p>
                                        <p className="text-[10px] font-bold text-emerald-600">{data.jobs} Jobs</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                   </div>
                   <button className="w-full mt-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all">
                        View Detailed Audit
                   </button>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">+ ₹{c.commission.toFixed(0)}</td>
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
                                        <p className="font-bold text-gray-900 text-sm">{c.service || '—'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{c.provider}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm text-gray-600 font-medium">₹{c.amount}</p>
                                        <p className="text-sm font-bold text-emerald-600">+₹{c.commission}</p>
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
