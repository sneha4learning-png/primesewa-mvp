import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const CleanupPage = () => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const runCleanup = async () => {
        setLoading(true);
        setStatus('🔍 Analyzing Database...');
        try {
            const providerSnapshot = await getDocs(collection(db, 'providers'));
            const userSnapshot = await getDocs(collection(db, 'users'));
            const batch = writeBatch(db);

            const providers = [];
            const users = [];

            providerSnapshot.forEach(d => providers.push({ id: d.id, ...d.data() }));
            userSnapshot.forEach(d => users.push({ id: d.id, ...d.data() }));

            const seen = new Map();
            const toDelete = [];

            // 1. Normalize Providers and Resolve Conflicts
            providers.forEach(p => {
                const rawName = p.name || 'Unknown';
                const nameKey = rawName.toLowerCase().replace(/servicies/g, 'services').replace(/\s+/g, ' ').trim();
                const isSneha = nameKey.includes('sneha');
                const isNewProv = nameKey.includes('new provider');
                const hasConflictingNumber = p.phone === '+911111111111' || p.phone === '1111111111';
                
                let normalizedPhone = p.phone || '+919999999999';
                if (isSneha || isNewProv || nameKey.includes('provider') || hasConflictingNumber) {
                    normalizedPhone = '+919999999999';
                }

                const updates = {
                    name: isSneha ? 'Sneha Services' : (isNewProv ? 'New Provider' : rawName.trim()),
                    phone: normalizedPhone,
                    status: (isSneha || isNewProv) ? 'active' : (p.status || 'active').toLowerCase().trim(),
                    isOnline: p.isOnline === true || String(p.isOnline) === 'true',
                    category: isSneha ? 'Carpentry' : (p.category || 'Professional Service'),
                    price: (isSneha || isNewProv) ? '₹200/hr' : (p.price || '₹500/hr')
                };

                if (seen.has(nameKey)) {
                    const existing = seen.get(nameKey);
                    const shouldKeepP = (!!p.uid && !existing.uid) || (p.isOnline && !existing.isOnline) || (p.jobs || 0) > (existing.jobs || 0);
                    if (shouldKeepP) {
                        toDelete.push(existing.id);
                        seen.set(nameKey, { ...p, ...updates });
                        batch.update(doc(db, 'providers', p.id), updates);
                    } else {
                        toDelete.push(p.id);
                    }
                } else {
                    seen.set(nameKey, { ...p, ...updates });
                    batch.update(doc(db, 'providers', p.id), updates);
                }
            });

            // 2. Normalize Users (Customers) and Handle Duplicates
            const seenUsers = new Map();
            users.forEach(u => {
                const rawName = u.name || 'Unknown';
                const nameKey = rawName.toLowerCase().replace(/\s+/g, ' ').trim();
                const phoneKey = (u.phone || u.phoneNumber || '').replace(/\D/g, '').slice(-10);
                const uniqueKey = `${nameKey}-${phoneKey}`;
                
                const isSneha = nameKey.includes('sneha');
                
                const updates = {
                    name: isSneha ? 'Sneha Customer' : rawName.trim(),
                    phone: isSneha ? '+911111111111' : (u.phone || u.phoneNumber || ''),
                    role: 'customer',
                    status: 'active' // Ensuring all processed users start as active
                };

                if (seenUsers.has(uniqueKey)) {
                    const existing = seenUsers.get(uniqueKey);
                    // Keep the one with more data/bookings or specific ID (testing preference)
                    toDelete.push(u.id);
                } else {
                    seenUsers.set(uniqueKey, { ...u, ...updates });
                    batch.update(doc(db, 'users', u.id), updates);
                }
            });

            toDelete.forEach(id => batch.delete(doc(db, 'providers', id)));

            await batch.commit();
            setStatus(`✅ SUCCESS! Cleaned ${toDelete.length} duplicates. Reassigned phone numbers for consistency.`);
        } catch (err) {
            console.error(err);
            setStatus(`❌ FAILED: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const unblockAll = async () => {
        setLoading(true);
        setStatus('🔓 Restoring Global Access...');
        try {
            const batch = writeBatch(db);
            const providerSnapshot = await getDocs(collection(db, 'providers'));
            const userSnapshot = await getDocs(collection(db, 'users'));

            providerSnapshot.forEach(d => {
                const data = d.data();
                if (data.status === 'blocked' || data.status === 'suspended') {
                    batch.update(doc(db, 'providers', d.id), { status: 'active' });
                }
            });

            userSnapshot.forEach(d => {
                const data = d.data();
                if (data.status === 'blocked') {
                    batch.update(doc(db, 'users', d.id), { status: 'active' });
                }
            });

            await batch.commit();
            setStatus('✅ GLOBAL RESTORE COMPLETE! All accounts are now active.');
        } catch (err) {
            console.error(err);
            setStatus(`❌ RESTORE FAILED: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6">
            <div className="bg-slate-800 border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
                    <span className="text-3xl">🛡️</span>
                </div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">DB Sanitizer v5</h1>
                <p className="text-slate-400 mb-10 text-sm font-medium leading-relaxed">
                    Resolves naming inconsistencies and merges duplicates. Ensures all users can access the platform.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={runCleanup}
                        disabled={loading}
                        className={`w-full py-5 rounded-2xl font-black text-lg transition-all duration-300 ${loading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'}`}
                    >
                        {loading ? 'Processing...' : 'Deep Sanitization'}
                    </button>

                    <button
                        onClick={unblockAll}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${loading ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 active:scale-95'}`}
                    >
                        Unblock All & Restore Access
                    </button>
                </div>

                {status && (
                    <div className={`mt-8 p-5 rounded-2xl text-sm font-bold border ${status.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        {status}
                    </div>
                )}

                <p className="mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                    Refresh Customer App after completion
                </p>
            </div>
        </div>
    );
};

export default CleanupPage;
