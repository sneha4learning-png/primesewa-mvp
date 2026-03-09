import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const CleanupPage = () => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const runCleanup = async () => {
        setLoading(true);
        setStatus('Cleaning up providers...');
        try {
            const snapshot = await getDocs(collection(db, 'providers'));
            const batch = writeBatch(db);
            const providers = [];

            snapshot.forEach(d => providers.push({ id: d.id, ...d.data() }));

            // 1. Identify duplicates and normalize
            const seen = new Map();
            const toDelete = [];

            providers.forEach(p => {
                const rawName = p.name || 'Unknown';
                const nameKey = rawName.toLowerCase().trim()
                    .replace('servicies', 'services'); // Fix common user typo

                // Normalization Logic
                const updates = {
                    name: rawName.trim(),
                    status: (p.status || 'active').toLowerCase().trim(),
                    isOnline: p.isOnline === true || String(p.isOnline) === 'true',
                    category: p.category || 'Service'
                };

                // Specific Fix: Sneha Variations -> Carpentry
                if (nameKey.includes('sneha')) {
                    updates.category = 'Carpentry';
                    updates.status = 'active';
                }

                if (seen.has(nameKey)) {
                    const existing = seen.get(nameKey);

                    const pIsReal = !!p.uid;
                    const eIsReal = !!existing.uid;
                    const pIsOnline = updates.isOnline;
                    const eIsOnline = !!existing.isOnline || String(existing.isOnline) === 'true';

                    // DECISION: Should we keep 'p' or the 'existing'?
                    // Keep 'p' if: 1. p is real and existing isn't, 2. p is online and existing isn't, 3. p has more jobs
                    const shouldKeepP = (pIsReal && !eIsReal) ||
                        (pIsReal === eIsReal && pIsOnline && !eIsOnline) ||
                        (pIsReal === eIsReal && pIsOnline === eIsOnline && (p.jobs || 0) > (existing.jobs || 0));

                    if (shouldKeepP) {
                        toDelete.push(existing.id);
                        seen.set(nameKey, p);
                        batch.update(doc(db, 'providers', p.id), updates);
                    } else {
                        toDelete.push(p.id);
                    }
                } else {
                    seen.set(nameKey, p);
                    batch.update(doc(db, 'providers', p.id), updates);
                }
            });

            // 2. Perform deletions
            toDelete.forEach(id => {
                batch.delete(doc(db, 'providers', id));
            });

            await batch.commit();
            setStatus(`✅ Done! Cleaned up ${toDelete.length} duplicates and normalized all records. Sneha is now fixed.`);
        } catch (err) {
            console.error(err);
            setStatus(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
                <h1 className="text-2xl font-black mb-4 tracking-tighter">DB Sanitizer v3</h1>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed">Fixes "Servicies" typo, prioritizes Online records in deduplication, and forces Sneha to "Carpentry".</p>
                <button
                    onClick={runCleanup}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
                >
                    {loading ? 'Processing...' : 'Run Deep Sanitization'}
                </button>
                {status && (
                    <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${status.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {status}
                    </div>
                )}
                <p className="mt-8 text-xs text-slate-400 font-medium">Please refresh the Customer App after running this.</p>
            </div>
        </div>
    );
};

export default CleanupPage;
