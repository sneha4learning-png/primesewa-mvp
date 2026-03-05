import { useState } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { UserCircle, Phone, Save, CheckCircle2 } from 'lucide-react';

const CustomerProfile = () => {
    const { userData, setUserData } = useAuth();

    // Fallback values if userData is missing slightly
    const initialName = userData?.name || (userData?.uid === 'mock-cust' ? 'Guest User' : '');
    const initialPhone = (userData?.phone || userData?.phoneNumber || '').replace('+91', '');

    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);

        // Mock save delay
        setTimeout(() => {
            // Update auth context sessionally
            setUserData(prev => ({ ...prev, name, phone: `+91${phone}` }));

            setIsSaving(false);
            setShowSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1000);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">My Profile</h1>
                <p className="text-lg text-slate-500 mt-2">Manage your personal information and contact details.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                {/* Decorative header */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <div className="absolute top-16 left-8 z-10 w-32 h-32 bg-white rounded-2xl flex items-center justify-center text-5xl font-black text-indigo-600 border-4 border-white shadow-xl">
                    {name ? name.charAt(0) : 'U'}
                </div>

                <div className="pt-24 px-8 pb-10">
                    <form onSubmit={handleSave} className="max-w-2xl space-y-8">

                        {/* Status Message */}
                        {showSuccess && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 className="w-5 h-5" />
                                <p className="font-bold text-sm">Profile updated successfully!</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Mobile Number</label>
                                <div className="relative">
                                    <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                        placeholder="9876543210"
                                    />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Used for booking communications</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-3 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600 hover:shadow-blue-600/30 active:scale-95'}`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
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
            </div>
        </div>
    );
};

export default CustomerProfile;
