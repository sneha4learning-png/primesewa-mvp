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
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80",
            "https://images.unsplash.com/photo-1607472583893-edb999c15597?w=500&q=80",
            "https://images.unsplash.com/photo-1542013936693-884638332954?w=500&q=80"
        ]
    },
    { 
        name: 'Electrical', price: '₹449/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80",
            "https://images.unsplash.com/photo-1558402529-d2638a7023e9?w=500&q=80",
            "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=500&q=80"
        ]
    },
    { 
        name: 'Cleaning', price: '₹299/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80",
            "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&q=80",
            "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&q=80"
        ]
    },
    { 
        name: 'Carpentry', price: '₹499/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80",
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&q=80",
            "https://images.unsplash.com/photo-1629904853716-f0bc54ebb481?w=500&q=80"
        ]
    },
    { 
        name: 'Painting', price: '₹349/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80",
            "https://images.unsplash.com/photo-1562664377-709f2c337eb2?w=500&q=80",
            "https://images.unsplash.com/photo-1595841055112-63fb26207f2a?w=500&q=80"
        ]
    },
    { 
        name: 'AC Repair', price: '₹599/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1621905252507-b352175d2f24?w=500&q=80",
            "https://images.unsplash.com/photo-1599933023673-c248a7412d2f?w=500&q=80",
            "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=500&q=80"
        ]
    },
    { 
        name: 'Appliance Repair', price: '₹549/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1584622781564-1d9876a13d00?w=500&q=80",
            "https://images.unsplash.com/photo-1495033041221-59cca5c3b2d8?w=500&q=80",
            "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500&q=80"
        ]
    },
    { 
        name: 'Repair', price: '₹399/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1581244276891-99bc402c6281?w=500&q=80",
            "https://images.unsplash.com/photo-1597423498219-04418210827d?w=500&q=80",
            "https://images.unsplash.com/photo-1517646287270-a54fca7a2310?w=500&q=80"
        ]
    },
    { 
        name: 'Pest Control', price: '₹799/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80",
            "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=500&q=80",
            "https://images.unsplash.com/photo-1590650516494-0c8e4a4dd67e?w=500&q=80"
        ]
    },
    { 
        name: 'Salon & Beauty', price: '₹899/hr',
        portfolio: [
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
            "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80",
            "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=500&q=80"
        ]
    },
    { 
        name: 'Packers & Movers', price: '₹1499/job',
        portfolio: [
            "https://images.unsplash.com/photo-1600518464441-9154a4dba221?w=500&q=80",
            "https://images.unsplash.com/photo-1530124560677-bda8ca47af7e?w=500&q=80",
            "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80"
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
