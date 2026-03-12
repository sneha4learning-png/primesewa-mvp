
import { db } from './web/src/firebase/config.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkProviders() {
    const qSnap = await getDocs(collection(db, 'providers'));
    qSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name}, Phone: ${doc.data().phone}`);
    });
}

checkProviders();
