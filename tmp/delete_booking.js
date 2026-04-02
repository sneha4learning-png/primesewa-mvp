
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteSpecificBooking() {
    console.log('Searching for booking: Plumbing (Tap Fix) on 2026-03-31 at 15:00 with price ₹361...');
    
    // Search by service and price as they are quite specific
    const snapshot = await db.collection('bookings')
        .where('service', '==', 'Plumbing (Tap Fix)')
        .where('price', '==', 361)
        .get();

    if (snapshot.empty) {
        // Try searching with string price if numerical fails
        const snapshot2 = await db.collection('bookings')
            .where('service', '==', 'Plumbing (Tap Fix)')
            .where('price', '==', '361')
            .get();
            
        if (snapshot2.empty) {
            console.log('No matching booking found.');
            return;
        }
        
        for (const doc of snapshot2.docs) {
            const data = doc.data();
            if (data.date === '2026-03-31' && data.time === '15:00') {
                console.log(`Found booking: ${doc.id}. Deleting...`);
                await doc.ref.delete();
                console.log('Deleted successfully.');
            }
        }
    } else {
        for (const doc of snapshot.docs) {
            const data = doc.data();
            // Verify date and time if possible
            if (data.date === '2026-03-31' && data.time === '15:00') {
                console.log(`Found booking: ${doc.id}. Deleting...`);
                await doc.ref.delete();
                console.log('Deleted successfully.');
            } else {
                console.log(`Found matching service/price but date/time mismatch: ${data.date} ${data.time}`);
            }
        }
    }
}

deleteSpecificBooking().catch(console.error);
