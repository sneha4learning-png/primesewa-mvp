import React, { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[999] overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Notifications</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={markAllAsRead}
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                                Mark all read
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={`p-4 border-b border-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                                    onClick={() => markAsRead(n.id)}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h4 className={`text-xs ${!n.read ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{n.title}</h4>
                                        <div className="flex items-center gap-1">
                                            {n.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                            {n.type === 'warning' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-300">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-bold">No notifications yet</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                        <button 
                            onClick={async () => {
                                await clearNotifications();
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Clear History
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
