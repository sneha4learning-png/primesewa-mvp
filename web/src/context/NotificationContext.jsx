import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../firebase/AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { currentUser, userData } = useAuth();

    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const userIdentifiers = [currentUser.uid];
        if (userData?.role) {
            userIdentifiers.push(userData.role);
        }
        // Also listen for notifications sent to user's name (common for provider identification)
        if (userData?.name) {
            userIdentifiers.push(userData.name);
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', 'in', userIdentifiers),
            limit(100) // Fetch enough to cover recent activity and unread count
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Calculate unread count from the broad fetched list (before slicing)
            const count = fetched.filter(n => !n.read).length;
            setUnreadCount(count);

            // Sort in-memory for the display list
            const sorted = fetched.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000 || 0;
                const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000 || 0;
                return timeB - timeA;
            });
            
            setNotifications(sorted.slice(0, 30)); // Keep slightly more for visibility
        });

        return () => {
            unsubscribe();
        };
    }, [currentUser, userData?.role, userData?.name]);

    const sendNotification = async (userId, title, message, type = 'info') => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId,
                title,
                message,
                type,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error sending notification:", err);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true
            });
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.read);
            const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
            await Promise.all(promises);
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    const clearNotifications = async () => {
        try {
            const userIdentifiers = [currentUser.uid];
            if (userData?.role) userIdentifiers.push(userData.role);
            if (userData?.name) userIdentifiers.push(userData.name);
            
            const q = query(
                collection(db, 'notifications'),
                where('userId', 'in', userIdentifiers)
            );
            
            const snapshot = await getDocs(q);
            const promises = snapshot.docs.map(d => deleteDoc(doc(db, 'notifications', d.id)));
            await Promise.all(promises);
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error("Error clearing notifications:", err);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, sendNotification, markAsRead, markAllAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};
