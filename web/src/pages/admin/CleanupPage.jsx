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
                const nameKey = rawName.toLowerCase().trim();

                // Normalization Logic
                const updates = {
                    name: rawName.trim(),
                    status: (p.status || 'active').toLowerCase().trim(),
                    isOnline: p.isOnline === true || String(p.isOnline) === 'true',
                    category: p.category || 'Service'
                };

                // Specific Fix: Sneha Services -> Carpentry
                if (nameKey.includes('sneha')) {
                    updates.category = 'Carpentry';
                    updates.status = 'active';
                }

                if (seen.has(nameKey)) {
                    const existing = seen.get(nameKey);
                    // If current has UID but existing doesn't, swap and delete existing
                    if (p.uid && !existing.uid) {
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
            setStatus(`✅ Done! Cleaned up ${toDelete.length} duplicates and normalized all records. Sneha is now in Carpentry.`);
        } catch (err) {
            console.error(err);
            setStatus(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl mt-20">
            <h1 className="text-3xl font-black mb-6">DB Sanitizer</h1>
            <button
                onClick={runCleanup}
                disabled={running}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-indigo-700 transition-all"
            >
                {running ? 'Processing...' : 'Run Cleanup & Seed Test Data'}
            </button>
            <div className="mt-8 bg-slate-900 text-emerald-400 p-6 rounded-2xl font-mono text-xs h-64 overflow-y-auto whitespace-pre-wrap ring-4 ring-slate-800">
                {log.join('\n')}
            </div>
        </div>
    );
};

export default CleanupPage;
