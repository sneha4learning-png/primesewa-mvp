import { useState, useEffect } from 'react';
import { Search, MapPin, UserX, Activity, XCircle, Clock } from 'lucide-react';
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
    const [allBookings, setAllBookings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetchAllAccounts = async () => {
            try {
                // 1. Fetch Customers
                const qUsers = query(collection(db, 'users'), where('role', '==', 'customer'));
                const usersSnap = await getDocs(qUsers);
                
                // 2. Fetch Bookings for count
                const bookingsSnap = await getDocs(collection(db, 'bookings'));
                const allBookingsList = [];
                const bookingCounts = {};
                bookingsSnap.forEach((doc) => {
                    const b = doc.data();
                    allBookingsList.push({ id: doc.id, ...b });
                    if (b.customer) bookingCounts[b.customer] = (bookingCounts[b.customer] || 0) + 1;
                });

                setAllBookings(allBookingsList);

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

    const handleViewHistory = (user) => {
        setSelectedUser(user);
        const filtered = allBookings.filter(b => b.customer === user.name);
        setUserBookings(filtered);
    };

    // Table should ONLY show customers, but dropdown uses full mixed list
    const customerList = users.filter(u => u.type === 'customer');
    
    const filteredUsers = customerList.filter(u =>
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

            {/* Universal Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="relative group">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search consumers by name or phone..."
                        className="w-full h-[48px] pl-12 pr-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-800 font-medium text-sm outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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

            {/* Customer Booking History Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden mx-auto max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                                    {selectedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">Customer • {selectedUser.phone} • Joined {selectedUser.joined}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-6 scrollbar-thin scrollbar-thumb-gray-200">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" /> Booking History ({userBookings.length} records)
                            </h4>
                            
                            {userBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {userBookings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(b => (
                                        <div key={b.id} className="group p-5 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all bg-white shadow-sm hover:shadow-md">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md tracking-widest">
                                                            {b.service}
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest ${
                                                            b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                                            b.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {b.status}
                                                        </span>
                                                    </div>
                                                    <h5 className="font-bold text-slate-900 text-base">Partner: {b.provider || 'Unassigned'}</h5>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900 text-lg">₹{b.proposedPrice || b.price || 0}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Amount</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 opacity-60" />
                                                        {b.date} • {b.time}
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 opacity-60" />
                                                        {b.address?.city || 'Ahmedabad'}
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    ID: {b.id.slice(-6).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Clock className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm tracking-tight uppercase">No booking history available</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all text-sm shadow-sm"
                            >
                                Close Activity Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
