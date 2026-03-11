import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAIbQbqLbqDlmrtR-p5R_ICWXwHU06e-BA",
    authDomain: "primeseva-mvp.firebaseapp.com",
    projectId: "primeseva-mvp",
    storageBucket: "primeseva-mvp.firebasestorage.app",
    messagingSenderId: "363714609925",
    appId: "1:363714609925:web:b0cf9af57782de28116d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const syncAndPrune = async () => {
    console.log("🚀 Starting Database Pruning and Metric Synchronization...");

    // 1. Fetch data
    const [bSnap, pSnap] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'providers'))
    ]);

    const bookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Sort bookings by creation date (newest first)
    const sortedBookings = bookings.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || new Date(a.date || 0).getTime();
        const timeB = b.createdAt?.toMillis?.() || new Date(b.date || 0).getTime();
        return timeB - timeA;
    });

    const keepCount = 100;
    const toKeep = sortedBookings.slice(0, keepCount);
    const toDelete = sortedBookings.slice(keepCount);

    console.log(`📊 Statistics:`);
    console.log(`   - Total BookingsFound: ${bookings.length}`);
    console.log(`   - Bookings to Keep: ${toKeep.length}`);
    console.log(`   - Bookings to Delete: ${toDelete.length}`);

    // 3. Delete old bookings
    if (toDelete.length > 0) {
        console.log(`🗑️ Deleting ${toDelete.length} old records in batches...`);
        let batch = writeBatch(db);
        let count = 0;
        
        for (const b of toDelete) {
            batch.delete(doc(db, 'bookings', b.id));
            count++;
            
            if (count % 400 === 0) {
                await batch.commit();
                batch = writeBatch(db);
            }
        }
        await batch.commit();
        console.log(`✅ Successfully deleted ${toDelete.length} records.`);
    }

    // 4. Recalculate Provider Metrics based on the KEPT bookings
    console.log("🔄 Recalculating Provider Ratings and Job Counts...");
    
    // Group ratings and job counts by provider name
    const providerStats = new Map();

    toKeep.forEach(b => {
        if (b.status === 'completed') {
            const stats = providerStats.get(b.provider) || { totalRating: 0, count: 0 };
            
            // If the booking has a rating, use it. Otherwise, use a default high rating for legacy/missing data?
            // Usually, ratings are submitted in a separate step or field.
            const rating = Number(b.customerRating) || 5.0; // Assume 5.0 if completed but not specifically rated
            
            stats.totalRating += rating;
            stats.count += 1;
            providerStats.set(b.provider, stats);
        }
    });

    let syncCount = 0;
    for (const p of providers) {
        const stats = providerStats.get(p.name);
        if (stats) {
            const avgRating = stats.totalRating / stats.count;
            console.log(`   - Syncing [${p.name}]: ${stats.count} jobs, Avg Rating: ${avgRating.toFixed(1)}`);
            await updateDoc(doc(db, 'providers', p.id), {
                jobs: stats.count,
                rating: avgRating,
                isOnline: p.isOnline !== undefined ? p.isOnline : true // Ensure isOnline default
            });
            syncCount++;
        } else {
            console.log(`   - Resetting [${p.name}]: No completed jobs found in current ${keepCount} records.`);
            await updateDoc(doc(db, 'providers', p.id), {
                jobs: 0,
                rating: 0,
                isOnline: p.isOnline !== undefined ? p.isOnline : true
            });
            syncCount++;
        }
    }

    console.log(`✅ Success: ${toDelete.length} records pruned. ${syncCount} providers synchronized.`);
    process.exit(0);
};

syncAndPrune().catch(console.error);
