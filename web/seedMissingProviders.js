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
    { 
        name: 'Plumbing', price: '₹399/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80",
            "https://images.unsplash.com/photo-1607472583893-edb999c15597?w=500&q=80",
            "https://images.unsplash.com/photo-1584622781564-1d9876a13d00?w=500&q=80"
        ]
    },
    { 
        name: 'Electrical', price: '₹449/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80",
            "https://images.unsplash.com/photo-1509475826633-fed577a2c71b?w=500&q=80",
            "https://images.unsplash.com/photo-1597424216809-3ba9864aeb18?w=500&q=80"
        ]
    },
    { 
        name: 'Cleaning', price: '₹299/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500&q=80",
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80",
            "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&q=80"
        ]
    },
    { 
        name: 'Carpentry', price: '₹499/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80",
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&q=80",
            "https://images.unsplash.com/photo-1588854337115-1c67d9247e4d?w=500&q=80"
        ]
    },
    { 
        name: 'Painting', price: '₹349/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80",
            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&q=80",
            "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=500&q=80"
        ]
    },
    { 
        name: 'AC Repair', price: '₹599/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1621905252507-b352175d2f24?w=500&q=80",
            "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=500&q=80",
            "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=500&q=80"
        ]
    },
    { 
        name: 'Appliance Repair', price: '₹549/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1574269908961-cf57e35e2a0c?w=500&q=80",
            "https://images.unsplash.com/photo-1611323160547-e1d1c6f8aec8?w=500&q=80",
            "https://images.unsplash.com/photo-1607189735742-b25c75035e5d?w=500&q=80"
        ]
    },
    { 
        name: 'Repair', price: '₹399/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1581244276891-99bc402c6281?w=500&q=80",
            "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&q=80",
            "https://images.unsplash.com/photo-1517646287270-a54fca7a2310?w=500&q=80"
        ]
    },
    { 
        name: 'Pest Control', price: '₹799/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80",
            "https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=500&q=80",
            "https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?w=500&q=80"
        ]
    },
    { 
        name: 'Salon & Beauty', price: '₹899/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80",
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&q=80"
        ]
    },
    { 
        name: 'Packers & Movers', price: '₹1499/job',
        portfolio: [
            "https://images.unsplash.com/photo-1600518464441-9154a4dba221?w=500&q=80",
            "https://images.unsplash.com/photo-1530124560677-bda8ca47af7e?w=500&q=80",
            "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=500&q=80"
        ]
    }
];

const seedMissingProviders = async () => {
    console.log("Checking for missing providers in categories...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => d.data());

    const activeOnlineCategories = new Set(
        providers.filter(p => (p.status === 'active' || p.status === 'approved') && (p.isOnline === true || String(p.isOnline) === 'true')).map(p => p.category)
    );

    for (const catObj of categories) {
        const cat = catObj.name;
        const providerId = `seed-${cat.toLowerCase().replace(/\s+/g, '-')}`;
        
        console.log(`Ensuring Prime Expert for Category [${cat}]...`);
        
        await setDoc(doc(db, 'providers', providerId), {
            uid: providerId,
            name: `Prime ${cat} Expert`,
            category: cat,
            status: 'active',
            isOnline: true,
            rating: 5.0,
            jobs: 1,
            phone: "+91 91000 00000",
            price: catObj.price,
            role: 'provider',
            serviceAreas: ["Vastrapur", "Prahlad Nagar", "Navrangpura", "Satellite"],
            idProofType: "Aadhar Card",
            idProofNumber: "XXXX-XXXX-9999",
            createdAt: serverTimestamp(),
            portfolio: catObj.portfolio,
            proofDocument: catObj.portfolio[0], 
            previousWorkSample: catObj.portfolio[1],
            proofDocumentName: "Verified_Badge.jpg"
        }, { merge: true });
        
        console.log(`✅ Verified: Prime ${cat} Expert with price ${catObj.price}`);
    }

    console.log("Seeding complete. Every category now has at least one active provider.");
    process.exit(0);
};

seedMissingProviders().catch(console.error);
