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
                
                // CRITICAL: Ensure Provider number doesn't conflict with Customer number
                // Sneha Customer = 1111111111, so Sneha Provider = 9999999999
                let normalizedPhone = p.phone || '+910000000000';
                if (isSneha || nameKey.includes('provider')) {
                    normalizedPhone = '+919999999999';
                }

                const updates = {
                    name: isSneha ? 'Sneha Services' : rawName.trim(),
                    phone: normalizedPhone,
                    status: isSneha ? 'active' : (p.status || 'active').toLowerCase().trim(),
                    isOnline: p.isOnline === true || String(p.isOnline) === 'true',
                    category: isSneha ? 'Carpentry' : (p.category || 'Professional Service'),
                    price: isSneha ? '₹200/hr' : (p.price || '₹500/hr')
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

            // 2. Normalize Users (Customers)
            users.forEach(u => {
                const isSneha = (u.name || '').toLowerCase().includes('sneha');
                if (isSneha) {
                    batch.update(doc(db, 'users', u.id), {
                        name: 'Sneha Customer',
                        phone: '+911111111111', // Fixed for Customer
                        role: 'customer'
                    });
                }
            });

            // Delete orphans/duplicates
            toDelete.forEach(id => batch.delete(doc(db, 'providers', id)));

            await batch.commit();
            setStatus(`✅ SUCCESS! Enforced unique numbers: Sneha Customer (1111111111) vs Sneha Services Provider (9999999999). Cleaned ${toDelete.length} duplicates. Ready for testing.`);
        } catch (err) {
            console.error(err);
            setStatus(`❌ FAILED: ${err.message}`);
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
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">DB Sanitizer v4</h1>
                <p className="text-slate-400 mb-10 text-sm font-medium leading-relaxed">
                    Resolves naming inconsistencies and merges duplicates while preserving online status.
                    Specifically fixes <span className="text-blue-400 font-bold">Sneha Services</span> visibility.
                </p>

                <button
                    onClick={runCleanup}
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all duration-300 ${loading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'}`}
                >
                    {loading ? 'Processing...' : 'Deep Sanitization'}
                </button>

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
