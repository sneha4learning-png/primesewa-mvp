import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { Lock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

const serviceImages = [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070&auto=format&fit=crop",
];

const serviceLabels = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Salon & Beauty'];

const AdminLogin = () => {
    const [pwd, setPwd] = useState('');
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % serviceImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (pwd === 'admin') {
            const adminUser = { uid: 'admin-master', role: 'admin', name: 'Super Admin' };
            setCurrentUser(adminUser);
            setUserData(adminUser);
            navigate('/admin');
        } else {
            setError('Unauthorized: Invalid access key.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 bg-[#0B0F19]">
            {/* Professional Background Slider */}
            <div className="absolute inset-0 z-0">
                {serviceImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-60' : 'opacity-0'}`}
                    >
                        <img src={img} alt="Service" className="w-full h-full object-cover" />
                    </div>
                ))}
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/50 via-[#0B0F19]/70 to-[#0B0F19]/95"></div>
                {/* Subtle blue/indigo accent for admin authority */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-transparent to-blue-950/20"></div>
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                {serviceImages.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`transition-all duration-300 rounded-full ${idx === currentImageIndex ? 'w-8 h-2 bg-indigo-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>

            {/* Service label */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
                <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                    {serviceLabels[currentImageIndex]}
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full">
                {/* Admin badge */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Admin Access</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 text-white">
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center justify-center mb-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-900/40">
                                <img
                                    src="/logo-v2.png"
                                    alt="PrimeSewa"
                                    className="h-10 object-contain"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <span className="text-3xl font-black text-white tracking-tighter">PrimeSewa</span>
                            <span className="text-xs font-medium text-indigo-400 mt-1 uppercase tracking-widest">Admin System</span>
                        </div>
                        <p className="text-white/40 text-sm">Authorized Personnel Only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">System Username</label>
                            <div className="relative group opacity-80">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <input
                                    type="text"
                                    value="admin"
                                    readOnly
                                    disabled
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none text-white/60 cursor-not-allowed transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="password"
                                    value={pwd}
                                    onChange={e => setPwd(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white tracking-widest placeholder-white/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 mt-2 group ${loading
                                ? 'bg-indigo-700/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-xl shadow-indigo-900/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? 'Authenticating...' : (
                                <>
                                    Establish Session
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
