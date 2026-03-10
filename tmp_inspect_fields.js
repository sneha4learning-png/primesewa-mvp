import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configContent = fs.readFileSync(path.join(__dirname, 'web', 'src', 'firebase', 'config.js'), 'utf-8');
const match = configContent.match(/const firebaseConfig = (\{[\s\S]*?\});/);
const configObj = eval(`(${match[1]})`);
const app = initializeApp(configObj);
const db = getFirestore(app);

async function run() {
    const q = query(collection(db, 'providers'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log("FIELDS IN PROVIDER RECORD:", Object.keys(snap.docs[0].data()));
        console.log("SAMPLE DATA:", snap.docs[0].data());
    } else {
        console.log("No providers found");
    }
    process.exit(0);
}

run().catch(console.error);
