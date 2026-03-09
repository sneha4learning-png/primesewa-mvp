import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const CleanupPage = () => {
    const [log, setLog] = useState(['Click to start cleanup...']);
    const [running, setRunning] = useState(false);

    const runCleanup = async () => {
        setRunning(true);
        const addLog = (msg) => setLog(prev => [...prev, msg]);
        addLog('🚀 Starting Cleanup...');

        try {
            const provSnap = await getDocs(collection(db, 'providers'));
            const allProviders = [];
            provSnap.forEach(d => allProviders.push({ id: d.id, ...d.data() }));

            addLog(`Found ${allProviders.length} provider records.`);

            const nameGroups = {};
            allProviders.forEach(p => {
                const name = p.name?.toLowerCase().trim();
                if (!name) return;
                if (!nameGroups[name]) nameGroups[name] = [];
                nameGroups[name].push(p);
            });

            for (const name in nameGroups) {
                const records = nameGroups[name];
                if (records.length > 1) {
                    addLog(`Found ${records.length} records for "${name}". Deduping...`);

                    // Priority: Has UID > Active > More Jobs
                    records.sort((a, b) => {
                        const aReal = !!a.uid;
                        const bReal = !!b.uid;
                        if (aReal !== bReal) return bReal ? 1 : -1;
                        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
                        return (b.jobs || 0) - (a.jobs || 0);
                    });

                    const [keep, ...remove] = records;
                    addLog(`KEEPING ID: ${keep.id}`);

                    for (const r of remove) {
                        await deleteDoc(doc(db, 'providers', r.id));
                        addLog(`DELETED ID: ${r.id}`);
                    }
                }
            }

            // Set test states: Ensure 3 specific pros are Online, others Offline
            addLog('Setting test online/offline states...');
            const finalSnap = await getDocs(collection(db, 'providers'));
            let count = 0;
            const promises = [];
            finalSnap.forEach(d => {
                const isSneha = d.data().name?.toLowerCase().includes('sneha');
                const isDeepak = d.data().name?.toLowerCase().includes('deepak');

                // Keep Deepak Online, Sneha Offline for testing
                let online = count < 3 && !isSneha;
                if (isDeepak) online = true;
                if (isSneha) online = false;

                promises.push(updateDoc(doc(db, 'providers', d.id), {
                    isOnline: online,
                    status: 'active' // Ensure they are active too
                }));
                count++;
            });
            await Promise.all(promises);

            addLog('✅ Cleanup and Seeding Finished!');
        } catch (err) {
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setRunning(false);
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
