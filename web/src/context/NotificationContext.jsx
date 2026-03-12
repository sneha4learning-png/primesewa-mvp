import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
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

        const q = query(
            collection(db, 'notifications'),
            where('userId', 'in', userIdentifiers),
            limit(50) // Fetch more to allow for in-memory sorting
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort in-memory: handle missing createdAt or non-timestamp values
            const sorted = fetched.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ?? 0) * 1000 || 0;
                const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ?? 0) * 1000 || 0;
                return timeB - timeA;
            });
            
            setNotifications(sorted.slice(0, 20)); // Keep only latest 20
        });

        // Separate listener for accurate unread count across ALL notifications
        const unreadQ = query(
            collection(db, 'notifications'),
            where('userId', 'in', userIdentifiers),
            where('read', '==', false)
        );

        const unsubscribeUnread = onSnapshot(unreadQ, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => {
            unsubscribe();
            unsubscribeUnread();
        };
    }, [currentUser, userData?.role]);

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

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, sendNotification, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
