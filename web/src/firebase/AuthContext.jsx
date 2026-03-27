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
        // Hydrate from localStorage for mock/dev users first
        const savedUser = localStorage.getItem('ps_user');
        const savedData = localStorage.getItem('ps_userData');
        if (savedUser && savedData) {
            try {
                setCurrentUser(JSON.parse(savedUser));
                setUserData(JSON.parse(savedData));
            } catch (e) {
                console.error("Failed to parse saved auth", e);
            }
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                localStorage.setItem('ps_user', JSON.stringify({ uid: user.uid, phoneNumber: user.phoneNumber }));

                try {
                    const phone = user.phoneNumber;
                    if (phone === "+910000000000") {
                        const adminData = { uid: "admin-uid", role: 'admin', phone, name: 'PrimeSewa Admin' };
                        setUserData(adminData);
                        localStorage.setItem('ps_userData', JSON.stringify(adminData));
                        setLoading(false);
                        return;
                    }

                    // Try Provider first to support "Open Provider Hub" from Customer profile
                    let providerDocRef = doc(db, 'providers', user.uid);
                    let providerDocSnap = await getDoc(providerDocRef);

                    if (providerDocSnap.exists()) {
                        const data = providerDocSnap.data();
                        if (data.status === 'blocked') {
                            await signOut(auth);
                            setCurrentUser(null);
                            setUserData(null);
                            localStorage.removeItem('ps_user');
                            localStorage.removeItem('ps_userData');
                            setLoading(false);
                            return;
                        }
                        const finalData = { ...data, uid: user.uid, role: 'provider' };
                        setUserData(finalData);
                        localStorage.setItem('ps_userData', JSON.stringify(finalData));
                    } else {
                        let userDocRef = doc(db, 'users', user.uid);
                        let userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const data = userDocSnap.data();
                            if (data.status === 'blocked') {
                                await signOut(auth);
                                setCurrentUser(null);
                                setUserData(null);
                                localStorage.removeItem('ps_user');
                                localStorage.removeItem('ps_userData');
                                setLoading(false);
                                return;
                            }
                            const finalData = { ...data, uid: user.uid, role: 'customer' };
                            setUserData(finalData);
                            localStorage.setItem('ps_userData', JSON.stringify(finalData));
                        } else {
                            const finalData = { uid: user.uid, role: 'customer' };
                            setUserData(finalData);
                            localStorage.setItem('ps_userData', JSON.stringify(finalData));
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role", error);
                }
            } else {
                // Only clear if we don't have a fake dev-mode user (which isn't in firebase auth)
                try {
                    const savedUserObj = savedUser ? JSON.parse(savedUser) : null;
                    if (!savedUserObj || (!savedUserObj.uid?.startsWith('dev-') && !savedUserObj.uid?.startsWith('mock-'))) {
                        setCurrentUser(null);
                        setUserData(null);
                        localStorage.removeItem('ps_user');
                        localStorage.removeItem('ps_userData');
                    }
                } catch (e) {
                    // If parsing fails, just clear everything to be safe
                    setCurrentUser(null);
                    setUserData(null);
                    localStorage.removeItem('ps_user');
                    localStorage.removeItem('ps_userData');
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Helper to log out properly
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Sign out error", e);
        }
        setCurrentUser(null);
        setUserData(null);
        localStorage.removeItem('ps_user');
        localStorage.removeItem('ps_userData');
    };

    // For development without real OTP, let's add a mock setup capability here
    const loginMock = (user, data) => {
        setCurrentUser(user);
        setUserData(data);
        localStorage.setItem('ps_user', JSON.stringify(user));
        localStorage.setItem('ps_userData', JSON.stringify(data));
    };

    const value = {
        currentUser,
        setCurrentUser: (user) => {
            setCurrentUser(user);
            if (user) localStorage.setItem('ps_user', JSON.stringify({ uid: user.uid, phoneNumber: user.phoneNumber }));
            else localStorage.removeItem('ps_user');
        },
        userData,
        setUserData: (data) => {
            setUserData(data);
            if (data) localStorage.setItem('ps_userData', JSON.stringify(data));
            else localStorage.removeItem('ps_userData');
        },
        loading,
        logout,
        loginMock
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
