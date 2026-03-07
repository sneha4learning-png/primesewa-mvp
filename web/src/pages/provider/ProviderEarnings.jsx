import { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Wallet, IndianRupee, CalendarDays, ArrowUpRight } from 'lucide-react';

const ProviderEarnings = () => {
    const { currentUser, userData } = useAuth();
    const [earningsLog, setEarningsLog] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0 });

    useEffect(() => {
        const providerName = userData?.name || currentUser?.displayName;
        if (!providerName) return;

        const loadDb = async () => {
            try {
                const q = query(collection(db, 'commissions'), where('provider', '==', providerName));
                const querySnapshot = await getDocs(q);

                const myCommissions = [];
                let totalNet = 0;
                let totalGross = 0;
                const trackedBookingIds = new Set();

                querySnapshot.forEach((doc) => {
                    const c = { id: doc.id, ...doc.data() };
                    myCommissions.push(c);
                    trackedBookingIds.add(c.bookingId);
                    totalGross += c.amount || 0;
                    totalNet += c.providerEarning || (c.amount - c.commission);
                });

                // Fetch completed bookings for this provider to fill in derived missing records
                const bookSnap = await getDocs(query(collection(db, 'bookings'), where('provider', '==', providerName), where('status', '==', 'completed')));
                bookSnap.forEach(doc => {
                    const b = { id: doc.id, ...doc.data() };
                    if (!trackedBookingIds.has(b.id)) {
                        const rawPrice = b.proposedPrice || b.price || b.amount || 0;
                        const amount = typeof rawPrice === 'number' ? rawPrice : parseInt((rawPrice || '').toString().replace(/[₹,/a-zA-Z\s]/g, '')) || 0;

                        myCommissions.push({
                            id: `derived-${b.id}`,
                            bookingId: b.id,
                            provider: b.provider,
                            amount: amount,
                            commission: parseFloat((amount * 0.15).toFixed(2)),
                            providerEarning: parseFloat((amount * 0.85).toFixed(2)),
                            date: b.date || new Date().toISOString()
                        });
                        totalGross += amount;
                        totalNet += amount * 0.85;
                    }
                });

                // Sort newest first
                myCommissions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                setEarningsLog(myCommissions);
                setStats({
                    total: totalGross,
                    paid: totalNet,
                    pending: totalGross - totalNet // Platform Fees Deducted
                });
            } catch (err) {
                console.error("Error fetching provider earnings:", err);
            }
        };

        loadDb();
        const interval = setInterval(loadDb, 5000);
        return () => clearInterval(interval);
    }, [currentUser, userData]);

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-indigo-600" /> Earnings History
            </h2>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-500/30">
                    <div className="flex items-center gap-3 mb-2 text-indigo-100">
                        <IndianRupee className="w-5 h-5" /> Total Earned (All Time)
                    </div>
                    <h2 className="text-3xl font-bold">₹{stats.total.toFixed(0)}</h2>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="text-gray-500 text-sm font-medium mb-1">Net Earnings (Yours)</div>
                    <h2 className="text-2xl font-bold text-gray-900">₹{stats.paid.toFixed(0)}</h2>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="text-gray-500 text-sm font-medium mb-1">Platform Fees Deducted</div>
                    <h2 className="text-2xl font-bold text-rose-600">₹{stats.pending.toFixed(0)}</h2>
                </div>
            </div>

            {/* Earnings Log Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
                </div>
                {earningsLog.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Job ID</th>
                                    <th className="px-6 py-4 font-medium text-right">Job Total</th>
                                    <th className="px-6 py-4 font-medium text-right text-rose-600">Platform Fee</th>
                                    <th className="px-6 py-4 font-medium text-right text-emerald-600">Your Net Earnings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {earningsLog.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-400" /> {new Date(log.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                            #{log.bookingId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ₹{log.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-600 text-right">
                                            -₹{log.commission.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 flex justify-end items-center gap-1">
                                            <ArrowUpRight className="w-4 h-4" /> ₹{(log.providerEarning || (log.amount - log.commission)).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500 bg-gray-50">
                        <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No earnings history found. Complete jobs to start earning!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderEarnings;
