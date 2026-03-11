import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";

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

const categories = [
    'Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Painting', 
    'AC Repair', 'Appliance Repair', 'Repair', 'Pest Control', 
    'Salon & Beauty', 'Packers & Movers'
];

const seedMissingProviders = async () => {
    console.log("Checking for missing providers in categories...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => d.data());

    const activeCategories = new Set(
        providers.filter(p => p.status === 'active' || p.status === 'approved').map(p => p.category)
    );

    for (const cat of categories) {
        if (!activeCategories.has(cat)) {
            console.log(`Category [${cat}] has 0 active providers. Adding a dummy approved provider...`);
            
            const providerName = `${cat} Expert`;
            const providerId = `seed-${cat.toLowerCase().replace(/\s+/g, '-')}`;
            
            await setDoc(doc(db, 'providers', providerId), {
                uid: providerId,
                name: providerName,
                category: cat,
                status: 'active',
                isOnline: true,
                rating: 0,
                jobs: 0,
                phone: "+91 99999 00000",
                price: "₹499/hr",
                role: 'provider',
                serviceAreas: ["Awas Vikas", "Kalyanpur", "Indira Nagar"],
                idProofType: "Aadhar Card",
                idProofNumber: "XXXX-XXXX-1234",
                createdAt: serverTimestamp(),
                proofDocument: "https://images.unsplash.com/photo-1633265486064-086b219458ce?w=500&q=80",
                previousWorkSample: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80",
                proofDocumentName: "Verified_Badge.jpg"
            });
            console.log(`Added: ${providerName}`);
        } else {
            console.log(`Category [${cat}] already has active providers.`);
        }
    }

    console.log("Seeding complete. Every category now has at least one active provider.");
    process.exit(0);
};

seedMissingProviders().catch(console.error);
