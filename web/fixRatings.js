import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

const fixRatings = async () => {
    console.log("Fetching all providers and bookings to verify data...");
    
    const [pSnap, bSnap] = await Promise.all([
        getDocs(collection(db, "providers")),
        getDocs(collection(db, "bookings"))
    ]);

    const activeBookings = bSnap.docs.map(d => d.data());
    const completedCounts = new Map();
    activeBookings.forEach(b => {
        if (b.status === 'completed') {
            completedCounts.set(b.provider, (completedCounts.get(b.provider) || 0) + 1);
        }
    });

    console.log("Analyzing provider metrics...");
    let updatedCount = 0;

    for (const pDoc of pSnap.docs) {
        const p = pDoc.data();
        const actualJobs = completedCounts.get(p.name) || 0;
        const currentStoredJobs = p.jobs || 0;
        const currentStoredRating = p.rating || 0;

        // If provider has 0 actual completed jobs but has a rating or job count > 0, reset it
        if (actualJobs === 0 && (currentStoredRating > 0 || currentStoredJobs > 0)) {
            console.log(`Fixing [${p.name}]: Resetting rating/jobs (Actual Jobs: 0, Stored Rating: ${currentStoredRating})`);
            await updateDoc(doc(db, 'providers', pDoc.id), {
                rating: 0,
                jobs: 0
            });
            updatedCount++;
        }
    }

    console.log(`Correction complete. Fixed ${updatedCount} providers.`);
    process.exit(0);
};

fixRatings().catch(console.error);
