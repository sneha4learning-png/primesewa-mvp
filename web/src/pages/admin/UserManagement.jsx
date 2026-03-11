import { useState, useEffect } from 'react';
import { Search, MapPin, UserX, Activity, ShieldAlert, UserCheck, ChevronDown, Filter } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';

const UserManagement = () => {
    const { sendNotification } = useNotifications();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userBookings, setUserBookings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetchAllAccounts = async () => {
            try {
                // 1. Fetch Customers
                const qUsers = query(collection(db, 'users'), where('role', '==', 'customer'));
                const usersSnap = await getDocs(qUsers);
                
                // 2. Fetch Providers
                const providersSnap = await getDocs(collection(db, 'providers'));
                
                // 3. Fetch Bookings for count
                const bookingsSnap = await getDocs(collection(db, 'bookings'));
                const bookingCounts = {};
                bookingsSnap.forEach((doc) => {
                    const b = doc.data();
                    if (b.customer) bookingCounts[b.customer] = (bookingCounts[b.customer] || 0) + 1;
                });

                const allAccounts = [];
                const seenIds = new Set();
                
                // Process Customers
                usersSnap.forEach((doc) => {
                    const data = doc.data();
                    if (seenIds.has(doc.id)) return;
                    seenIds.add(doc.id);
                    allAccounts.push({
                        id: doc.id,
                        name: data.name || 'Unknown User',
                        phone: data.phone || data.phoneNumber || 'No phone',
                        joined: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Recent',
                        totalBookings: bookingCounts[data.name] || 0,
                        status: data.status || 'active',
                        type: 'customer',
                        collection: 'users'
                    });
                });

                // Process Providers for the dropdown
                providersSnap.forEach((doc) => {
                    const data = doc.data();
                    if (seenIds.has(doc.id)) return; // Avoid adding same physical record twice if for some reason it's in both
                    seenIds.add(doc.id);
                    allAccounts.push({
                        id: doc.id,
                        name: data.name || 'Unknown Partner',
                        phone: data.phone || 'No phone',
                        joined: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Recent',
                        totalBookings: 0,
                        status: (data.status || 'pending').includes('active') ? 'active' : 'blocked', // Normalize status for simple toggle
                        type: 'partner',
                        collection: 'providers'
                    });
                });

                setUsers(allAccounts);
            } catch (err) {
                console.error("Error fetching accounts:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllAccounts();
    }, []);

    const handleToggleStatus = async (id, currentStatus) => {
        const user = users.find(u => u.id === id);
        if (!user) return;

        const newStatus = (currentStatus === 'active' || currentStatus === 'approved') ? 'blocked' : 'active';
        const actionLabel = newStatus === 'active' ? 'RESTORE and UNBLOCK' : 'INSTANTLY BLOCK';
        
        if (!window.confirm(`Are you sure you want to ${actionLabel} access for this ${user.type} account?`)) {
            return;
        }

        try {
            await updateDoc(doc(db, user.collection || 'users', id), { status: newStatus });
            setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
            
            // Notify User
            sendNotification(id, 'Account Update', `Your account has been marked as ${newStatus} by the administrator.`, newStatus === 'active' ? 'success' : 'error');
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update status. Please try again.");
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

    // Table should ONLY show customers, but dropdown uses full mixed list
    const customerList = users.filter(u => u.type === 'customer');
    
    const filteredUsers = customerList.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
    );

    // Universal list for the dropdown
    const universalList = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-6">
            {/* Quick Account Control */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <ShieldAlert className="w-6 h-6 text-amber-500" />
                        <h2 className="text-xl font-black tracking-tight">Quick Account Control</h2>
                    </div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Select an account to instantly block or restore access</p>
                </div>
                <div className="p-6 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <select 
                                className="w-full h-[52px] pl-4 pr-10 appearance-none bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-800 font-bold text-sm shadow-sm cursor-pointer outline-none transition-all"
                                onChange={(e) => {
                                    const user = users.find(u => u.id === e.target.value);
                                    if (user) {
                                        handleToggleStatus(user.id, user.status);
                                        e.target.value = ""; // Reset to default "Select user..." option
                                    }
                                }}
                                value=""
                            >
                                <option value="" disabled>Select user to toggle status...</option>
                                {universalList.map(u => (
                                    <option key={`${u.type}-${u.id}`} value={u.id} className="py-2">
                                        {u.type === 'customer' ? '[CONSUMER]' : '[PARTNER]'} {u.name} — {u.status === 'active' ? '✅ ACTIVE' : '🚫 BLOCKED'}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <div className="flex-1 relative group">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Universal name or phone search..."
                                className="w-full h-[52px] pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-800 font-medium text-sm shadow-sm outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-black text-slate-800">Consumer Directory</h2>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full tracking-tighter shadow-sm border border-blue-100">
                        {users.length} Database Records
                    </span>
                </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                {/* Desktop view (table) */}
                <table className="hidden md:table w-full text-left border-collapse min-w-[800px]">
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
                        {paginatedUsers.map(user => (
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

                {/* Mobile/Small Screen Grid View */}
                <div className="md:hidden grid grid-cols-1 divide-y divide-gray-100">
                    {paginatedUsers.map(user => (
                        <div key={user.id} className="p-4 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{user.status} • Member Since {user.joined}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {user.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <div>Phone: <span className="font-semibold">{user.phone}</span></div>
                                <div>Bookings: <span className="font-bold text-blue-600">{user.totalBookings}</span></div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleViewHistory(user)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                    <Activity className="w-4 h-4" /> Activity History
                                </button>
                                {user.status === 'active' ? (
                                    <button onClick={() => handleToggleStatus(user.id, user.status)} className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                                        Block User
                                    </button>
                                ) : (
                                    <button onClick={() => handleToggleStatus(user.id, user.status)} className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                        Unblock
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {paginatedUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
                    )}
                </div>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500 font-medium">
                        Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-gray-900">{filteredUsers.length}</span> consumers
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

export default UserManagement;
