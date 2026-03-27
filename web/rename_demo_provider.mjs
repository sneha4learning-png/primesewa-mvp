
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

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

async function renameDuplicate() {
    try {
        const q = query(collection(db, 'providers'), where('name', '==', 'Demo Provider'));
        const snap = await getDocs(q);
        
        console.log(`Found ${snap.size} Demo Providers`);
        
        if (snap.size > 1) {
            // Keep the first one and rename the rest?
            // Usually user only wants one changed.
            const targetDoc = snap.docs[0];
            const newName = "Ace Service Partner";
            await updateDoc(doc(db, 'providers', targetDoc.id), {
                name: newName
            });
            console.log(`Updated Provider ${targetDoc.id} name to: ${newName}`);
        } else {
            console.log("No duplicate Demo Provider found.");
        }
    } catch (e) {
        console.error(e);
    }
}

renameDuplicate();
