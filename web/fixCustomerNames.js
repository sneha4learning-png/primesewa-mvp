import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Hardcoded config just for this script
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: "primeseva-mvp.firebaseapp.com",
    projectId: "primeseva-mvp",
    storageBucket: "primeseva-mvp.appspot.com",
    messagingSenderId: "367375211993",
    appId: "1:367375211993:web:5b967d7164b383792cbcc2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixCustomerNames() {
    try {
        console.log("Fetching bookings...");
        const bookingsRef = collection(db, 'bookings');

        // Find bookings where customer name is exactly "Completed Job Customer"
        const q1 = query(bookingsRef, where('customer', '==', 'Completed Job Customer'));
        const snap1 = await getDocs(q1);

        if (snap1.size > 0) {
            console.log("FIRST BOOKING:", snap1.docs[0].data());
        }

        console.log(`Found ${snap1.size} bookings with "Completed Job Customer"`);

        const firstNames = ["Rahul", "Priya", "Amit", "Sneha", "Karan", "Pooja", "Vikram", "Nina", "Rohan", "Anjali"];
        const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Desai", "Mehta", "Joshi", "Verma", "Rathore", "Iyer"];

        let count = 0;
        for (const bookingDoc of snap1.docs) {
            const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
            await updateDoc(doc(db, 'bookings', bookingDoc.id), {
                customer: randomName
            });
            count++;
        }
        console.log(`Successfully updated ${count} bookings.`);

        process.exit(0);
    } catch (err) {
        console.error("Error fixing customer names:", err);
        process.exit(1);
    }
}

fixCustomerNames();
