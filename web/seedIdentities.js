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

const seedProviderIdentities = async () => {
    console.log("Fetching providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const dummyIdTypes = ["Aadhar Card", "PAN Card", "Driving License"];
    const dummyExperience = ["3 Years", "5 Years", "8 Years", "10+ Years", "2 Years"];
    const dummyDescription = "Professional and punctual service provider dedicated to high-quality work. Fully verified and trained.";

    // Unsplash tech/tool images for work portfolio, and generic card vectors for IDs
    const dummyPortfolio = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80";
    const dummyIdProof = "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80";

    for (const p of providers) {
        // Skip if they already have an ID number (assume already seeded or organic)
        if (p.idNumber) {
            console.log(`Skipping ${p.name}, already has identity details.`);
            continue;
        }

        const idType = dummyIdTypes[Math.floor(Math.random() * dummyIdTypes.length)];
        const idNum = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const exp = dummyExperience[Math.floor(Math.random() * dummyExperience.length)];

        console.log(`Seeding Identity for ${p.name}...`);

        await updateDoc(doc(db, 'providers', p.id), {
            idType: idType,
            idNumber: idNum,
            idProofUrl: dummyIdProof,
            experience: exp,
            description: p.description || dummyDescription,
            portfolioUrl: dummyPortfolio
        });

        console.log(`  -> Given ${idType} (${idNum}) and ${exp} experience.`);
    }

    console.log("Done seeding identity and portfolio records for old providers.");
    process.exit(0);
};

seedProviderIdentities().catch(console.error);
