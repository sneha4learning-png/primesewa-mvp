import { useState, useEffect } from 'react';
import { Search, MoreVertical, CheckCircle, XCircle, ShieldOff, FileText, ExternalLink } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import TimelineModal from '../../components/TimelineModal';

const ProviderManagement = () => {
    const [providers, setProviders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [providerBookings, setProviderBookings] = useState([]);
    const [viewDocumentUrl, setViewDocumentUrl] = useState(null);
    const [timelineBooking, setTimelineBooking] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const [pSnap, bSnap] = await Promise.all([
                    getDocs(collection(db, 'providers')),
                    getDocs(collection(db, 'bookings'))
                ]);

                const allBookings = bSnap.docs.map(d => d.data());
                const completedCounts = new Map();
                allBookings.forEach(b => {
                    if (b.status === 'completed') {
                        completedCounts.set(b.provider, (completedCounts.get(b.provider) || 0) + 1);
                    }
                });

                const fetched = [];
                pSnap.forEach((doc) => {
                    const data = doc.data();
                    const actualCompleted = completedCounts.get(data.name) || 0;
                    fetched.push({
                        id: doc.id,
                        ...data,
                        jobs: Math.min(actualCompleted, 5) // Cap at 5 for display as per requirement
                    });
                });
                setProviders(fetched);
            } catch (err) {
                console.error("Error fetching providers:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProviders();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'providers', id), { status: newStatus });
            setProviders(providers.map(p => p.id === id ? { ...p, status: newStatus } : p));
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleViewHistory = async (provider) => {
        setSelectedProvider(provider);
        try {
            const q = query(collection(db, 'bookings'), where('provider', '==', provider.name));
            const querySnapshot = await getDocs(q);
            const fetched = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            // Keep all history in the modal but counts were capped in the table
            setProviderBookings(fetched);
        } catch (err) {
            console.error("Error fetching provider history:", err);
        }
    };

    const filteredProviders = providers.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || 'Plumbing').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
    const paginatedProviders = filteredProviders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {timelineBooking && <TimelineModal booking={timelineBooking} onClose={() => setTimelineBooking(null)} />}
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Provider Fleet</h2>
                <div className="relative w-full sm:w-72">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search providers..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                            <th className="px-6 py-4 font-medium">Provider Name</th>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Contact</th>
                            <th className="px-6 py-4 font-medium">Jobs Done</th>
                            <th className="px-6 py-4 font-medium">Rate</th>
                            <th className="px-6 py-4 font-medium relative">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedProviders.map(provider => (
                            <tr key={provider.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">{provider.name}</div>
                                    <div className="text-xs text-gray-500">ID: {provider.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{provider.category || 'Plumbing'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{provider.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{provider.jobs || 0}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">{provider.price || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                    ${provider.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                            provider.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-red-50 text-red-700 border-red-200'}`}>
                                        {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2 flex-wrap max-w-[300px]">
                                        <button onClick={() => handleViewHistory(provider)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm border border-blue-100" title="View Details & History">
                                            <Search className="w-4 h-4" />
                                        </button>
                                        {provider.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleStatusChange(provider.id, 'active')} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors shadow-sm border border-green-100" title="Approve Provider">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleStatusChange(provider.id, 'rejected')} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shadow-sm border border-red-100" title="Reject Provider">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleStatusChange(provider.id, 'suspended')} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors shadow-sm border border-amber-100" title="Suspend Provider">
                                                    <ShieldOff className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {provider.status === 'active' && (
                                            <button onClick={() => handleStatusChange(provider.id, 'suspended')} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors shadow-sm border border-amber-100" title="Suspend Provider">
                                                <ShieldOff className="w-4 h-4" />
                                            </button>
                                        )}
                                        {provider.status === 'suspended' && (
                                            <button onClick={() => handleStatusChange(provider.id, 'active')} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shadow-sm border border-emerald-100" title="Reactivate Provider">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {provider.status === 'rejected' && (
                                            <button onClick={() => handleStatusChange(provider.id, 'pending')} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors shadow-sm border border-slate-100" title="Review Again">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedProviders.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                    No providers found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500 font-medium">
                        Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredProviders.length)}</span> of <span className="text-gray-900">{filteredProviders.length}</span> providers
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

            {/* Provider Booking History Modal */}
            {selectedProvider && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedProvider(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedProvider.name}</h3>
                                <p className="text-sm text-gray-500">{selectedProvider.category} • {selectedProvider.phone}</p>
                            </div>
                            <button onClick={() => setSelectedProvider(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {/* Identity & Work Records — shown for review */}
                            <div className="p-6 border-b border-gray-100">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Identity & Credentials</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">ID Type</p>
                                        <p className="font-bold text-gray-800">{selectedProvider.idProofType || <span className="text-gray-400 font-normal">Not provided</span>}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">ID Number</p>
                                        <p className="font-bold text-gray-800">{selectedProvider.idProofNumber || <span className="text-gray-400 font-normal">Not provided</span>}</p>
                                    </div>
                                    {/* Work Description explicitly removed below */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 col-span-2">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Identity Document</p>
                                        <a href={selectedProvider.proofDocument || "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=800&q=80"} target="_blank" rel="noreferrer" className="block w-full max-w-[200px] rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity shadow-sm">
                                            <img
                                                src={selectedProvider.proofDocument && selectedProvider.proofDocument.startsWith('http') ? selectedProvider.proofDocument : "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80"}
                                                alt="ID Proof"
                                                className="w-full h-auto object-cover"
                                                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80"; }}
                                            />
                                        </a>
                                        {(!selectedProvider.proofDocument || !selectedProvider.proofDocument.startsWith('http')) && (
                                            <p className="text-[10px] text-amber-600 mt-2 font-bold italic">Showing sample ID (Original not available)</p>
                                        )}
                                    </div>
                                </div>
                                {/* Removed workDescription rendering here */}
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Work Portfolio / Sample</p>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        <a href={selectedProvider.previousWorkSample || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"} target="_blank" rel="noreferrer" className="block w-32 h-24 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity flex-shrink-0">
                                            <img src={selectedProvider.previousWorkSample || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80"} alt="Work 1" className="w-full h-full object-cover" />
                                        </a>
                                        <div className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                                            <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80" alt="Work 2" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                                            <img src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300&q=80" alt="Work 3" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    {selectedProvider.previousWorkSample && (
                                        <div className="mt-2 text-right">
                                            <a href={selectedProvider.previousWorkSample} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                                                <ExternalLink className="w-3 h-3" /> External Link
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {selectedProvider.status === 'pending' && (
                                    <div className="mt-4 flex gap-3">
                                        <button onClick={() => { handleStatusChange(selectedProvider.id, 'active'); setSelectedProvider(null); }} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors">
                                            ✓ Approve Provider
                                        </button>
                                        <button onClick={() => { handleStatusChange(selectedProvider.id, 'rejected'); setSelectedProvider(null); }} className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm border border-red-200 transition-colors">
                                            ✕ Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Booking History */}
                            <div className="p-6">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Booking History ({providerBookings.length} jobs)</h4>
                                {providerBookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {providerBookings.map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all bg-white">
                                                <div>
                                                    <p className="font-bold text-gray-900">{b.service}</p>
                                                    <p className="text-sm text-gray-500">{b.date} • Customer: {b.customer}</p>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    <div>
                                                        <p className="font-bold text-emerald-600">₹{b.proposedPrice || b.price}</p>
                                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{b.status}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setTimelineBooking(b)}
                                                        className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
                                                        title="View Journey"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">No booking history yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewDocumentUrl && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" /> Identity / Proof Document
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={viewDocumentUrl} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                                    Open in New Tab <ExternalLink className="w-4 h-4" />
                                </a>
                                <button onClick={() => setViewDocumentUrl(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center relative overflow-hidden">
                            {viewDocumentUrl.includes('mock-storage') ? (
                                <div className="text-center w-full max-w-md bg-white p-12 rounded-3xl shadow-sm border border-gray-200">
                                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="w-12 h-12 text-blue-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-2">Simulated Document</h4>
                                    <p className="text-gray-500 mb-6">In the live app, this will display the actual uploaded PDF/Image via an iframe or img tag.</p>
                                    <code className="text-xs bg-gray-100 p-2 rounded block break-all text-gray-600 border border-gray-200">
                                        {viewDocumentUrl}
                                    </code>
                                </div>
                            ) : (
                                <iframe src={viewDocumentUrl} className="w-full h-full bg-white border-none rounded-xl shadow-inner" title="Document Viewer" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderManagement;
