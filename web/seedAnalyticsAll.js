import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";

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

const getRandomDateInLast7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 7));
    return d.toISOString().split('T')[0];
};

const getRandomTime = () => {
    const hours = Math.floor(Math.random() * (18 - 9) + 9);
    return `${hours.toString().padStart(2, '0')}:00`;
};

const getRandomPrice = () => {
    const min = 300;
    const max = 2500;
    const raw = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.round(raw / 50) * 50;
};

const seedAnalytics = async () => {
    console.log("Fetching providers...");
    const pSnap = await getDocs(collection(db, "providers"));
    const providers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const targetSum = 6;

    for (const p of providers) {
        if (p.name === 'Thakor Lal') continue;
        if (p.status !== 'active') continue;

        let jobsToAdd = Math.max(2, Math.floor(Math.random() * targetSum));
        console.log(`Adding ${jobsToAdd} recent jobs for ${p.name}`);

        for (let i = 0; i < jobsToAdd; i++) {
            const price = getRandomPrice();
            const date = getRandomDateInLast7Days();

            const newBooking = {
                customer: `Cust-${Math.floor(Math.random() * 9000) + 1000}`,
                provider: p.name || 'Unknown Provider',
                service: p.category || 'General Service',
                date: date,
                time: getRandomTime(),
                status: 'completed',
                price: price,
                proposedPrice: price,
                amount: price,
                address: '123 Test St, Ahmedabad',
                createdAt: new Date(date)
            };

            const bRef = await addDoc(collection(db, 'bookings'), newBooking);
            const commRef = await addDoc(collection(db, 'commissions'), {
                bookingId: bRef.id,
                providerId: p.id,
                providerName: p.name,
                amount: price,
                commission: price * 0.15,
                date: date,
                status: 'paid',
                createdAt: new Date(date)
            });

            console.log(`  Added booking ${bRef.id} and commission ${commRef.id}`);
        }

        const currentJobs = parseInt(p.jobs) || 0;
        await updateDoc(doc(db, 'providers', p.id), {
            jobs: currentJobs + jobsToAdd
        });
        console.log(`  Updated total jobs for ${p.name} to ${currentJobs + jobsToAdd}`);
    }

    console.log("Done seeding recent analytics for all providers.");
    process.exit(0);
};

seedAnalytics().catch(console.error);
