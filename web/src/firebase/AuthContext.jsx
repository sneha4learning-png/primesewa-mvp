import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null); // Role info and details from Firestore
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch role from users or providers collection
                try {
                    // Check Admin first (often handled via Custom Claims, but for MVP we check a 'users' doc with role)
                    // This block is for a mock admin user for development purposes
                    const phone = user.phoneNumber; // Assuming user.phoneNumber is available
                    if (phone === "+910000000000") {
                        setUserData({ uid: "admin-uid", role: 'admin', phone, name: 'PrimeSewa Admin' });
                        setLoading(false); // Set loading to false here as well
                        return;
                    }

                    let userDocRef = doc(db, 'users', user.uid);
                    let userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        // BUG-7: Block blocked users from accessing the app
                        if (data.status === 'blocked') {
                            console.warn('User is blocked. Signing out.');
                            await signOut(auth);
                            setCurrentUser(null);
                            setUserData(null);
                            setLoading(false);
                            return;
                        }
                        setUserData({ ...data, uid: user.uid });
                    } else {
                        // Check if provider
                        let providerDocRef = doc(db, 'providers', user.uid);
                        let providerDocSnap = await getDoc(providerDocRef);
                        if (providerDocSnap.exists()) {
                            setUserData({ ...providerDocSnap.data(), uid: user.uid, role: 'provider' });
                        } else {
                            setUserData({ uid: user.uid, role: 'customer' }); // Default fallback
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role", error);
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // For development without real OTP, let's add a mock setup capability here
    const value = {
        currentUser,
        setCurrentUser,
        userData,
        loading,
        setUserData // useful for setting mock users during dev
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
