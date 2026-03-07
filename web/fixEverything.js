import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Using explicit config from your .env
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

const fixEverything = async () => {
    // 1. Fix Images using more robust placeholders than Unsplash which might block hotlinking
    console.log("Fetching providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const providerMap = new Map();

    for (const p of providers) {
        // Cache for lookup later during bookings fix
        providerMap.set(p.name, p.category || 'Plumbing');

        console.log(`Seeding rock-solid Dummy Images for ${p.name}...`);

        await updateDoc(doc(db, 'providers', p.id), {
            proofDocument: `https://picsum.photos/seed/${p.id}/500/300`,
            previousWorkSample: `https://picsum.photos/seed/work_${p.id}/500/300`,
            proofDocumentName: "Click to View Details"
        });
    }
    console.log("Images fixed.");

    // 2. Fix History Bookings
    console.log("\nFetching bookings to enforce category fixes in history...");
    const bSnap = await getDocs(collection(db, "bookings"));
    const bookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const b of bookings) {
        const correctCategory = providerMap.get(b.provider);
        if (correctCategory && (b.service === 'General Service' || !b.service || b.service !== correctCategory)) {
            console.log(`Fixing Booking ${b.id} for ${b.provider}: '${b.service}' -> '${correctCategory}'`);
            await updateDoc(doc(db, 'bookings', b.id), {
                service: correctCategory
            });
        }
    }
    console.log("History records fully fixed.");

    process.exit(0);
};

fixEverything().catch(console.error);
