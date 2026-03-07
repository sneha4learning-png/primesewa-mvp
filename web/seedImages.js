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

const seedHighQualityImages = async () => {
    console.log("Fetching providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const dummyPortfolio = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80"; // Tech/Tool Generic Image
    const dummyIdProof = "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80";   // Card Vector Generic Image

    for (const p of providers) {
        console.log(`Seeding HD Dummy Images for ${p.name}...`);

        await updateDoc(doc(db, 'providers', p.id), {
            proofDocument: dummyIdProof,
            previousWorkSample: dummyPortfolio,
            proofDocumentName: "Uploaded_Identity_Document.jpg" // Prevent fallback text
        });
    }

    console.log("Done seeding HD dummy images.");
    process.exit(0);
};

seedHighQualityImages().catch(console.error);
