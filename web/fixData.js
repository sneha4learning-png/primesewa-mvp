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

const migrateData = async () => {
    console.log("Fetching providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const categoryMap = {}; // name -> category

    for (const p of providers) {
        let updates = {};

        categoryMap[p.name] = p.category;

        // Key Migrations
        if (p.idType && !p.idProofType) updates.idProofType = p.idType;
        if (p.idNumber && !p.idProofNumber) updates.idProofNumber = p.idNumber;
        if (p.experience && !p.yearsExperience) updates.yearsExperience = parseInt(p.experience) || p.experience;
        if (p.description && !p.workDescription) updates.workDescription = p.description;
        if (p.idProofUrl && !p.proofDocument) updates.proofDocument = p.idProofUrl;
        if (p.idProofUrl && !p.proofDocumentName) updates.proofDocumentName = "Identity_Document_Imported.jpg";
        if (p.portfolioUrl && !p.previousWorkSample) updates.previousWorkSample = p.portfolioUrl;

        if (Object.keys(updates).length > 0) {
            console.log(`Migrating Provider keys for: ${p.name}`);
            await updateDoc(doc(db, 'providers', p.id), updates);
        }
    }

    console.log("Fetching bookings to fix General Service...");
    const bSnap = await getDocs(collection(db, "bookings"));
    const bookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const b of bookings) {
        if (!b.service || b.service === 'General Service' || b.service === 'Other') {
            const properCategory = categoryMap[b.provider];
            if (properCategory) {
                console.log(`Fixing Booking ${b.id} for ${b.provider}: 'General Service' -> '${properCategory}'`);
                await updateDoc(doc(db, 'bookings', b.id), { service: properCategory });
            }
        }
    }

    console.log("Migration complete.");
    process.exit(0);
};

migrateData().catch(console.error);
