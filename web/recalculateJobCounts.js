import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

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

const recalculateJobCounts = async () => {
    console.log("Starting job count recalculation...");

    console.log("Fetching all providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("Fetching all completed bookings...");
    const bSnap = await getDocs(query(collection(db, "bookings"), where("status", "==", "completed")));
    const completedBookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Found ${providers.length} providers and ${completedBookings.length} completed bookings.`);

    for (const p of providers) {
        // Count bookings where provider matches current provider name
        // Some bookings might store provider as name, some might use UID if we updated it recently
        const count = completedBookings.filter(b => b.provider === p.name || b.providerUid === p.uid).length;

        if (p.jobs !== count) {
            console.log(`🔄 Updating ${p.name}: [Old Count: ${p.jobs || 0}] -> [New Count: ${count}]`);
            await updateDoc(doc(db, 'providers', p.id), {
                jobs: count
            });
        } else {
            console.log(`✅ ${p.name} is already correct (${count} jobs).`);
        }
    }

    console.log("✨ Job counts recalculated and synchronized.");
    process.exit(0);
};

recalculateJobCounts().catch(err => {
    console.error("❌ Error during recalculation:", err);
    process.exit(1);
});
