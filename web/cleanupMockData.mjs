import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from the web folder
const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, "web", ".env") });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanMockData() {
    console.log("Connecting to Firestore to scan for mock data...");

    // 1. Clean Bookings
    const bookingsSnap = await getDocs(collection(db, "bookings"));
    let mockBookingsDeleted = 0;
    for (const d of bookingsSnap.docs) {
        const data = d.data();
        // Identify mock data: either missing core fields OR customer contains "Demo" or "Cust-"
        if (!data.customer || data.customer === "Demo Customer" || data.customer.startsWith("Cust-")) {
            await deleteDoc(doc(db, "bookings", d.id));
            mockBookingsDeleted++;
        }
    }
    console.log(`Deleted ${mockBookingsDeleted} mock bookings.`);

    // 2. Clean Commissions
    const commissionsSnap = await getDocs(collection(db, "commissions"));
    let mockCommissionsDeleted = 0;
    for (const d of commissionsSnap.docs) {
        const data = d.data();
        if (!data.customer || data.customer === "Demo Customer" || data.customer.startsWith("Cust-")) {
            await deleteDoc(doc(db, "commissions", d.id));
            mockCommissionsDeleted++;
        }
    }
    console.log(`Deleted ${mockCommissionsDeleted} mock commission records.`);

    // 3. Clean Providers
    const providersSnap = await getDocs(collection(db, "providers"));
    let mockProvidersDeleted = 0;
    for (const d of providersSnap.docs) {
        const data = d.data();
        // Mock providers have names like "Ramesh Plumbing", "Suresh Electrician", "Mahesh Cleaning"
        if (["Ramesh Plumbing", "Suresh Electrician", "Mahesh Cleaning"].includes(data.name) || !data.phone) {
            await deleteDoc(doc(db, "providers", d.id));
            mockProvidersDeleted++;
        }
    }
    console.log(`Deleted ${mockProvidersDeleted} mock providers.`);

    console.log("Database cleanup complete!");
    process.exit(0);
}

cleanMockData().catch(console.error);
