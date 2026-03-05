import { useState, useEffect } from 'react';
import { Search, MapPin, UserX, Activity } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userBookings, setUserBookings] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // 1. Fetch User Accounts
                const q = query(collection(db, 'users'), where('role', '==', 'customer'));
                const querySnapshot = await getDocs(q);

                // 2. Fetch all Bookings to calculate authentic Lifetime Bookings
                const bookingsSnap = await getDocs(collection(db, 'bookings'));
                const bookingCounts = {};
                bookingsSnap.forEach((doc) => {
                    const b = doc.data();
                    if (b.customer) {
                        bookingCounts[b.customer] = (bookingCounts[b.customer] || 0) + 1;
                    }
                });

                const fetchedUsers = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const userName = data.name || 'Unknown User';

                    fetchedUsers.push({
                        id: doc.id,
                        name: userName,
                        phone: data.phone || data.phoneNumber || 'No phone',
                        joined: data.createdAt
                            ? (data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date(data.createdAt).toLocaleDateString())
                            : 'Recent',
                        totalBookings: bookingCounts[userName] || 0, // Dynamic calculation
                        status: data.status || 'active'
                    });
                });
                setUsers(fetchedUsers);
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        try {
            await updateDoc(doc(db, 'users', id), { status: newStatus });
            setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleViewHistory = async (user) => {
        setSelectedUser(user);
        try {
            const q = query(collection(db, 'bookings'), where('customer', '==', user.name));
            const querySnapshot = await getDocs(q);
            const fetched = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setUserBookings(fetched);
        } catch (err) {
            console.error("Error fetching user history:", err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Consumer Accounts</h2>
                <div className="relative w-full sm:w-72">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users by name or phone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                            <th className="px-6 py-4 font-medium">Customer Details</th>
                            <th className="px-6 py-4 font-medium">Contact Info</th>
                            <th className="px-6 py-4 font-medium">Member Since</th>
                            <th className="px-6 py-4 font-medium text-center">Lifetime Bookings</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">ID: {user.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.joined}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                                        {user.totalBookings}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                    ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => handleViewHistory(user)} className="text-blue-600 hover:text-blue-800 transition-colors" title="View Activity">
                                            <Activity className="w-5 h-5" />
                                        </button>
                                        {user.status === 'active' ? (
                                            <button onClick={() => handleToggleStatus(user.id, user.status)} className="text-red-500 hover:text-red-700 transition-colors" title="Block User">
                                                <UserX className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleToggleStatus(user.id, user.status)} className="text-green-600 hover:text-green-800 text-sm font-medium underline">
                                                Unblock
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* User Activity Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden mx-4">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}'s History</h3>
                                <p className="text-sm text-gray-500">Lifetime Bookings tracked here: {userBookings.length}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
                                <span className="text-2xl font-bold leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {userBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {userBookings.map(b => (
                                        <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all bg-white">
                                            <div>
                                                <p className="font-bold text-gray-900">{b.service}</p>
                                                <p className="text-sm text-gray-500">{b.date || 'No Date'} • Provider: {b.provider}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600">₹{b.proposedPrice || b.price}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{b.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 space-y-3">
                                    <Activity className="w-10 h-10 text-gray-300 mx-auto" />
                                    <p>No booking history found for this user.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
