export const INITIAL_PROVIDERS = [];
export const INITIAL_BOOKINGS = [];
export const INITIAL_USERS = [];
export const INITIAL_COMMISSIONS = [];

export const initDb = () => {
    // FORCE WIPE: Detect and remove legacy dummy data based on known dummy IDs ('p1', 'u1', etc.)
    const currentProviders = localStorage.getItem('mockProviders');
    if (currentProviders && currentProviders.includes('"id":"p1"')) {
        console.warn("Wiping old dummy data to prepare for production run.");
        localStorage.removeItem('mockProviders');
        localStorage.removeItem('mockBookings');
        localStorage.removeItem('mockCommissions');
        localStorage.removeItem('mockUsers');
    }

    if (!localStorage.getItem('mockProviders')) {
        localStorage.setItem('mockProviders', JSON.stringify(INITIAL_PROVIDERS));
    }
    if (!localStorage.getItem('mockBookings')) {
        localStorage.setItem('mockBookings', JSON.stringify(INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem('mockCommissions')) {
        localStorage.setItem('mockCommissions', JSON.stringify(INITIAL_COMMISSIONS));
    }
    if (!localStorage.getItem('mockUsers')) {
        localStorage.setItem('mockUsers', JSON.stringify(INITIAL_USERS));
    }

    // Migration for old local storage data
    try {
        const rawBookings = localStorage.getItem('mockBookings');
        if (rawBookings) {
            let bookings = JSON.parse(rawBookings);
            let migrated = false;

            bookings = bookings.map(b => {
                let updated = { ...b };

                if (updated.address === 'Pending Location') {
                    updated.address = 'Address not provided (Old)';
                    migrated = true;
                }

                if (updated.date === 'Pending Assignment') {
                    updated.date = 'No Date';
                    updated.time = 'No Time';
                    migrated = true;
                } else if (!updated.time && updated.date && updated.date.includes(' at ')) {
                    const parts = updated.date.split(' at ');
                    updated.date = parts[0];
                    updated.time = parts[1];
                    migrated = true;
                }

                return updated;
            });

            if (migrated) {
                localStorage.setItem('mockBookings', JSON.stringify(bookings));
            }
        }
    } catch (e) {
        console.error("Migration error", e);
    }
};

export const getProviders = () => JSON.parse(localStorage.getItem('mockProviders') || '[]');
export const getBookings = () => JSON.parse(localStorage.getItem('mockBookings') || '[]');
export const getCommissions = () => JSON.parse(localStorage.getItem('mockCommissions') || '[]');
export const getUsers = () => JSON.parse(localStorage.getItem('mockUsers') || '[]');

export const updateUserStatusDb = (id, status) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index > -1) {
        users[index].status = status;
        localStorage.setItem('mockUsers', JSON.stringify(users));
    }
};

export const addProvider = (provider) => {
    const providers = getProviders();
    const newProvider = { ...provider, id: Date.now().toString(), status: 'pending', isOnline: false };
    providers.push(newProvider);
    localStorage.setItem('mockProviders', JSON.stringify(providers));
    return newProvider;
};

export const updateProviderOnlineStatus = (id, isOnline) => {
    const providers = getProviders();
    const index = providers.findIndex(p => p.id === id);
    if (index > -1) {
        providers[index].isOnline = isOnline;
        localStorage.setItem('mockProviders', JSON.stringify(providers));
    }
};

export const updateProviderStatus = (id, status) => {
    const providers = getProviders();
    const index = providers.findIndex(p => p.id === id);
    if (index > -1) {
        providers[index].status = status;
        localStorage.setItem('mockProviders', JSON.stringify(providers));
    }
};

export const rateProviderDb = (providerName, newRating) => {
    const providers = getProviders();
    const index = providers.findIndex(p => p.name === providerName);
    if (index > -1) {
        const p = providers[index];
        const currentRating = p.rating || 5.0;
        const totalJobs = p.jobs || 1;

        // Simple moving average for mockup
        const updatedRating = ((currentRating * totalJobs) + newRating) / (totalJobs + 1);
        providers[index].rating = parseFloat(updatedRating.toFixed(1));
        localStorage.setItem('mockProviders', JSON.stringify(providers));
    }
};

export const saveBooking = (booking) => {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('mockBookings', JSON.stringify(bookings));
};

export const updateBookingStatus = (id, status, extraData = {}) => {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index > -1) {
        bookings[index] = { ...bookings[index], status, ...extraData };
        localStorage.setItem('mockBookings', JSON.stringify(bookings));

        // Generate Commission Record if status is 'completed'
        if (status === 'completed') {
            const finalPrice = bookings[index].proposedPrice || bookings[index].price || bookings[index].amount;
            const commissionCut = finalPrice * 0.15; // 15% Platform Cut

            const commissions = getCommissions();
            const newCommission = {
                id: `C${Date.now().toString().slice(-4)}`,
                bookingId: id,
                date: new Date().toISOString().split('T')[0],
                provider: bookings[index].provider,
                amount: finalPrice,
                commission: commissionCut
            };
            commissions.push(newCommission);
            localStorage.setItem('mockCommissions', JSON.stringify(commissions));
        }
    }
};

// Auto-initialize DB on import
initDb();

