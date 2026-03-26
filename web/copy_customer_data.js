import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc, doc, getDoc } from 'firebase/firestore';

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

const sourceUid = "dev-cust-1111111111";
const targetUid = "dev-cust-7567714737";

async function copyData() {
    console.log(`COPYING DATA FROM [${sourceUid}] TO [${targetUid}]...`);

    // 1. Copy Customer Profile
    const custRef = doc(db, 'customers', sourceUid);
    const custSnap = await getDoc(custRef);
    if (custSnap.exists()) {
        const data = custSnap.data();
        await setDoc(doc(db, 'customers', targetUid), { ...data, uid: targetUid });
        console.log(`- Copied profile in 'customers'`);
    }

    // 2. Copy Bookings
    const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('customerUid', '==', sourceUid)));
    console.log(`- Found ${bookingsSnap.size} bookings. Copying...`);
    for (const d of bookingsSnap.docs) {
        const data = d.data();
        await addDoc(collection(db, 'bookings'), { 
            ...data, 
            customerUid: targetUid,
            copiedFrom: d.id,
            timestamp: new Date()
        });
        console.log(`  - Copied booking: ${d.id}`);
    }

    // 3. Copy records in 'users'
    const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', sourceUid)));
    for (const d of usersSnap.docs) {
        const data = d.data();
        await setDoc(doc(db, 'users', targetUid), { ...data, uid: targetUid });
        console.log(`- Copied user record for UID [${targetUid}]`);
    }

    console.log("\nSUCCESS: All data copied.");
    process.exit(0);
}

copyData().catch(e => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
});
