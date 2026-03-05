import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const CommissionDashboard = () => {
    const [commissions, setCommissions] = useState([]);
    const [totalCommission, setTotalCommission] = useState(0);

    const [timeRange, setTimeRange] = useState('All');

    useEffect(() => {
        const fetchCommissions = async () => {
            try {
                const snap = await getDocs(collection(db, 'commissions'));
                const dbCommissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Filter by timeRange
                let filtered = dbCommissions;
                const today = new Date();

                if (timeRange === '7days') {
                    const limit = new Date(today.setDate(today.getDate() - 7));
                    filtered = dbCommissions.filter(c => new Date(c.date || c.createdAt) >= limit);
                } else if (timeRange === 'thisMonth') {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    filtered = dbCommissions.filter(c => {
                        const d = new Date(c.date || c.createdAt);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    });
                }

                // Sort by newest first 
                const sorted = [...filtered].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                setCommissions(sorted);
                setTotalCommission(sorted.reduce((acc, curr) => acc + (curr.commission || 0), 0));
            } catch (err) {
                console.error("Error fetching commissions:", err);
            }
        };

        fetchCommissions();
    }, [timeRange]);

    const handleExportCSV = () => {
        if (commissions.length === 0) return alert('No data to export');

        const headers = ['Record ID', 'Booking ID', 'Date', 'Provider', 'Job Amount', 'Platform Cut'];
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
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm shadow-emerald-600/20 transition-all">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-500/30">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-emerald-50">Total Revenue (15%)</h3>
                    </div>
                    <p className="text-4xl font-bold tracking-tight">₹{totalCommission.toFixed(2)}</p>
                    <p className="text-emerald-100 mt-2 text-sm">For the selected period</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Recent Commission Records</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-medium">Record ID</th>
                                <th className="px-6 py-4 font-medium">Booking ID</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Provider</th>
                                <th className="px-6 py-4 font-medium text-right">Job Amount</th>
                                <th className="px-6 py-4 font-medium text-right text-emerald-600">Platform Cut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {commissions.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{c.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer hover:underline">{c.bookingId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 text-right">₹{c.amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">+ ₹{c.commission}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CommissionDashboard;
