import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configContent = fs.readFileSync('web/src/firebase/config.js', 'utf-8');
const match = configContent.match(/const firebaseConfig = (\{[\s\S]*?\});/);
const configObj = eval(`(${match[1]})`);
const app = initializeApp(configObj);
const db = getFirestore(app);

const sourceUid = "dev-cust-1111111111";
const collections = ['bookings', 'customers', 'users', 'activity', 'notifications'];

async function inspect() {
    for (const collName of collections) {
        try {
            const snap = await getDocs(collection(db, collName));
            console.log(`\nCollection: ${collName} (Total docs: ${snap.size})`);
            
            // Check for sourceUid in various fields
            const fieldsToCheck = ['customerUid', 'uid', 'userId', 'userId'];
            
            for (const field of fieldsToCheck) {
                const q = query(collection(db, collName), where(field, '==', sourceUid));
                const qSnap = await getDocs(q);
                if (qSnap.size > 0) {
                    console.log(`  - Found ${qSnap.size} docs where ${field} == ${sourceUid}`);
                    // Print one sample id
                    console.log(`    Sample ID: ${qSnap.docs[0].id}`);
                }
            }
        } catch (e) {
            // Collection might not exist
        }
    }
    process.exit(0);
}

inspect().catch(console.error);
