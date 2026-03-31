import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from the web folder
const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, "web", ".env") });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanMockData() {
    console.log("Connecting to Firestore for final production cleanup...");
    const batch = writeBatch(db);

    // 1. Purge Dynamic Content
    const colRefs = ['bookings', 'payouts', 'commissions'];
    for (const col of colRefs) {
        const snap = await getDocs(collection(db, col));
        console.log(`Purging ${snap.size} records from ${col}...`);
        snap.forEach(d => batch.delete(d.ref));
    }

    // 2. Identify & Remove Mock Providers
    let deletedProviders = 0;
    let resetProviders = 0;
    const pSnap = await getDocs(collection(db, 'providers'));
    pSnap.forEach(d => {
        const p = d.data();
        const isMock = d.id.startsWith('dev-prov-') || !p.phone || ["Test Provider", "Ace Service Partner", "New provider", "Anjali Premium Beauty", "Rajesh Grooming Studio", "Sanjay Services", "Priya Home Care", "Vikram Painting Expert"].includes(p.name);
        
        if (isMock) {
            batch.delete(d.ref);
            deletedProviders++;
        } else {
            // Reset stats for real providers
            batch.update(d.ref, {
                jobs: 0,
                rating: 0,
                ratingCount: 0
            });
            resetProviders++;
        }
    });

    console.log(`Deleted ${deletedProviders} mock providers.`);
    console.log(`Reset stats for ${resetProviders} real providers.`);
    
    await batch.commit();
    console.log("Database successfully cleaned for production!");
    process.exit(0);
}

cleanMockData().catch(err => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
