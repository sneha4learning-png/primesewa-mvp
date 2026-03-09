import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config dynamically 
const configContent = fs.readFileSync(path.join(__dirname, 'web', 'src', 'firebase', 'config.js'), 'utf-8');
const match = configContent.match(/const firebaseConfig = (\{[\s\S]*?\});/);

if (!match) {
    console.error("Could not parse config");
    process.exit(1);
}

const configObj = eval(`(${match[1]})`);
const app = initializeApp(configObj);
const db = getFirestore(app);

async function run() {
    console.log("FETCHING ALL PROVIDERS...");
    const snap = await getDocs(collection(db, 'providers'));

    const table = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name,
            phone: data.phone,
            category: data.category,
            status: data.status
        };
    });

    console.table(table);
    process.exit(0);
}

run().catch(console.error);
