
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAIbQbqLbqDlmrtR-p5R_ICWXwHU06e-BA",
    authDomain: "primesewa-mvp.firebaseapp.com",
    projectId: "primesewa-mvp",
    storageBucket: "primesewa-mvp.firebasestorage.app",
    messagingSenderId: "363714609925",
    appId: "1:363714609925:web:b0cf9af57782de28116d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Searching for booking: Plumbing (Tap Fix) on 2026-03-31 at 15:00 with price ₹361...");
    
    // Many fields might be strings in the DB
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('service', '==', 'Plumbing (Tap Fix)'));
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
        console.log("No booking found with service 'Plumbing (Tap Fix)'");
        return;
    }
    
    let deletedCount = 0;
    for (const d of snap.docs) {
        const data = d.data();
        const priceMatch = (String(data.price) === '361');
        const dateMatch = (data.date === '2026-03-31');
        const timeMatch = (data.time === '15:00');
        
        console.log(`Checking Doc ID: ${d.id} | Price: ${data.price} | Date: ${data.date} | Time: ${data.time}`);
        
        if (priceMatch && dateMatch && timeMatch) {
            console.log(`MATCH FOUND! Deleting ${d.id}...`);
            await deleteDoc(doc(db, 'bookings', d.id));
            deletedCount++;
        }
    }
    
    if (deletedCount === 0) {
        console.log("Found matches for service but Price/Date/Time didn't match.");
    } else {
        console.log(`Successfully deleted ${deletedCount} booking(s).`);
    }
    process.exit(0);
}

run().catch(console.error);
