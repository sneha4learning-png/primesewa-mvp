import { useState } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { UserCircle, Phone, Save, CheckCircle2, Shield, Star, Clock, Zap, Edit3, ExternalLink, Wrench } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

const CustomerProfile = () => {
    const { userData, setUserData } = useAuth();

    const initialName = userData?.name || (userData?.uid === 'mock-cust' ? 'Guest User' : '');
    const initialPhone = (userData?.phone || userData?.phoneNumber || '').replace('+91', '');

    const [name, setName] = useState(initialName);
    const [phone] = useState(initialPhone);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (!userData?.uid?.includes('mock-')) {
                const userRef = doc(db, 'users', userData.uid);
                await updateDoc(userRef, { name });
            }
            setUserData(prev => ({ ...prev, name }));
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating name:', err);
            alert('Failed to update name. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    const memberSince = userData?.createdAt?.toDate?.()?.getFullYear?.() || '2024';

    const stats = [
        { icon: Star, label: 'Bookings', value: '—', color: 'text-amber-500', bg: 'bg-amber-50' },
        { icon: Clock, label: 'Member Since', value: memberSince, color: 'text-blue-500', bg: 'bg-blue-50' },
    ];

    const hasChanges = name.trim() !== initialName.trim();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 px-4 py-10">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your account details and preferences.</p>
                </div>

                {/* Hero Card */}
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/10">
                    {/* Banner */}
                    <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1200')] bg-cover mix-blend-overlay opacity-20" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl" />
                    </div>

                    {/* Avatar + Name */}
                    <div className="bg-white px-8 pb-10">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-10 relative z-10">
                            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-5xl font-black text-white border-[6px] border-white shadow-2xl shadow-indigo-600/40 shrink-0 transform transition-transform hover:scale-105 duration-300">
                                {initial}
                            </div>
                            <div className="pb-2 pt-6 sm:ml-4 flex-1">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{name || 'Your Name'}</h2>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 opacity-60">
                                    PrimeSewa Customer
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-lg font-black text-slate-900 mt-0.5">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Edit Form */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                            <Edit3 className="w-4.5 h-4.5 text-white w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">Personal Information</h3>
                            <p className="text-xs text-slate-500">Update your account name</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="px-8 py-8 space-y-6">
                        {showSuccess && (
                            <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <p className="font-bold text-sm">Profile updated successfully!</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 outline-none"
                                        placeholder="e.g. Rahul Desai"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Mobile Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+91</span>
                                    <input
                                        type="tel"
                                        readOnly
                                        disabled
                                        value={phone}
                                        className="w-full pl-14 pr-4 py-4 bg-slate-100/50 border border-slate-200 rounded-2xl transition-all font-medium text-slate-400 outline-none cursor-not-allowed"
                                        placeholder="9876543210"
                                    />
                                </div>
                                <p className="text-[11px] font-bold text-rose-500/80 uppercase tracking-widest mt-1">Cannot change: Used as login identity</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving || !hasChanges}
                                className={`px-8 py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-3 text-white
                                        ${isSaving || !hasChanges
                                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/30 hover:shadow-xl hover:-translate-y-0.5 active:scale-95'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Account Type / Switcher Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-8 group hover:border-indigo-100 transition-all duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Wrench className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">Professional Account</h3>
                                <p className="text-slate-500 font-medium text-sm mt-1">Manage your services, requests, and professional earnings.</p>
                            </div>
                        </div>
                        <a
                            href="/provider"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/10 hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-95"
                        >
                            Open Provider Portal
                            <ExternalLink className="w-4.5 h-4.5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerProfile;
