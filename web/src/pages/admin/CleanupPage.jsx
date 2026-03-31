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
            const toDelete = [];

            providerSnapshot.forEach(d => providers.push({ id: d.id, ...d.data() }));
            userSnapshot.forEach(d => users.push({ id: d.id, ...d.data() }));

            // 1. Normalize Providers and Resolve Conflicts
            const combinedProviders = new Map();
            providers.forEach((p, idx) => {
                let rawPhone = (p.phone || '').replace(/\D/g, '');
                
                // INTELLIGENT 10-DIGIT EXTRACTION
                if (rawPhone.startsWith('91') && rawPhone.length > 10) {
                    rawPhone = rawPhone.slice(2);
                }
                const normalized = rawPhone.slice(0, 10);
                const phoneKey = normalized || `DUMMY-${idx}`;
                
                const rawName = p.name || 'Professional Partner';
                const currentCategory = (p.category || '').toUpperCase();
                
                const updates = {
                    name: rawName.trim(),
                    phone: `+91${normalized}`, // Standard 10-digit format
                    status: 'active',
                    isOnline: p.isOnline === true || String(p.isOnline) === 'true',
                    // Auto-Correct: 'SERVICE' -> 'Plumbing'
                    category: (currentCategory === 'SERVICE' || currentCategory === 'PROFESSIONAL SERVICE' || !currentCategory) ? 'Plumbing' : p.category,
                    price: (parseInt(String(p.price || 0).replace(/\D/g, '')) > 200) ? '₹149' : (String(p.price || '₹149').replace(/₹|\/hr/g, ''))
                };

                if (combinedProviders.has(phoneKey)) {
                    const existing = combinedProviders.get(phoneKey);
                    // PRIORITIZATION: Prefer dev-prov- (real signup)
                    const pIsReal = p.id.startsWith('dev-');
                    const eIsReal = existing.id.startsWith('dev-');

                    if (pIsReal && !eIsReal) {
                        toDelete.push(existing.id);
                        combinedProviders.set(phoneKey, { id: p.id, ...updates });
                        batch.update(doc(db, 'providers', p.id), updates);
                    } else if (!pIsReal && eIsReal) {
                        toDelete.push(p.id);
                    } else {
                        // Both same priority, keep the one with more data
                        if (Object.keys(p).length > Object.keys(existing).length) {
                             toDelete.push(existing.id);
                             combinedProviders.set(phoneKey, { id: p.id, ...updates });
                             batch.update(doc(db, 'providers', p.id), updates);
                        } else {
                             toDelete.push(p.id);
                        }
                    }
                } else {
                    combinedProviders.set(phoneKey, { id: p.id, ...updates });
                    batch.update(doc(db, 'providers', p.id), updates);
                }
            });

            // 2. Normalize Users (Customers) and Handle Duplicates
            const seenUsers = new Map();
            users.forEach(u => {
                const phoneKey = (u.phone || u.phoneNumber || '').replace(/\D/g, '').replace(/^91/, '').slice(-10);
                const uniqueKey = phoneKey || u.id;
                
                const updates = {
                    role: 'customer',
                    status: 'active'
                };

                if (seenUsers.has(uniqueKey)) {
                    toDelete.push(u.id);
                } else {
                    seenUsers.set(uniqueKey, { id: u.id, ...updates });
                    batch.update(doc(db, 'users', u.id), updates);
                }
            });

            // 3. Execution Phase
            toDelete.forEach(id => {
                batch.delete(doc(db, 'providers', id));
                batch.delete(doc(db, 'users', id));
            });

            await batch.commit();
            setStatus(`✅ SUCCESS! Merged duplicates & mass-approved ${combinedProviders.size} providers.`);
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
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">DB Sanitizer v6</h1>
                <p className="text-slate-400 mb-10 text-sm font-medium leading-relaxed">
                    Resolves phone number conflicts (1111111111), merges duplicates, and restores global account access.
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
                        onClick={async () => {
                            setLoading(true);
                            setStatus('🧼 Zeroing All Metrics...');
                            try {
                                const providersSnap = await getDocs(collection(db, 'providers'));
                                const bookingsSnap = await getDocs(collection(db, 'bookings'));
                                const batch = writeBatch(db);
                                
                                // 1. Map actual counts and ratings from EVERYTHING current
                                const jobCounts = new Map();
                                const ratingsSum = new Map();
                                const ratingsCount = new Map();

                                bookingsSnap.forEach(d => {
                                    const b = d.data();
                                    if (b.status === 'completed' && b.provider) {
                                        jobCounts.set(b.provider, (jobCounts.get(b.provider) || 0) + 1);
                                        if (b.rating && b.rating > 0) {
                                            ratingsSum.set(b.provider, (ratingsSum.get(b.provider) || 0) + b.rating);
                                            ratingsCount.set(b.provider, (ratingsCount.get(b.provider) || 0) + 1);
                                        }
                                    }
                                });

                                let updated = 0;
                                providersSnap.forEach(d => {
                                    const p = d.data();
                                    const actualJobs = jobCounts.get(p.name) || 0;
                                    const avgRating = ratingsCount.get(p.name) ? (ratingsSum.get(p.name) / ratingsCount.get(p.name)).toFixed(1) : 0;
                                    
                                    batch.update(doc(db, 'providers', d.id), { 
                                        jobs: actualJobs,
                                        rating: parseFloat(avgRating) 
                                    });
                                    updated++;
                                });

                                // REPAIR BROKEN BOOKINGS (Unassigned/Blank Recovery)
                                bookingsSnap.forEach(d => {
                                    const b = d.data();
                                    const currentName = b.provider || b.providerName || '';
                                    if (!currentName || currentName.toLowerCase() === 'unassigned' || currentName.toLowerCase() === 'expert partner') {
                                        // Attempt recovery match based on category and proximity to base pricing
                                        const bestMatch = providersSnap.docs.find(pd => {
                                            const p = pd.data();
                                            return p.category === b.category && (p.status === 'active' || p.status === 'approved');
                                        });

                                        if (bestMatch) {
                                            const bm = bestMatch.data();
                                            batch.update(doc(db, 'bookings', d.id), {
                                                provider: bm.name,
                                                providerName: bm.name,
                                                providerUid: bestMatch.id,
                                                providerPhone: bm.phone || ''
                                            });
                                        }
                                    }
                                });

                                await batch.commit();
                                setStatus(`✅ SUCCESS! Profile Sync & Booking Repair Complete.`);
                            } catch (err) {
                                setStatus(`❌ ERROR: ${err.message}`);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${loading ? 'bg-slate-700 text-slate-500' : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 active:scale-95'}`}
                    >
                        Sync Profiles (Ratings & Jobs ↔ Bookings)
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
