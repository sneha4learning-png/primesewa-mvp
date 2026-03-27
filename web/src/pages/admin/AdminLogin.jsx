import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { Lock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

const serviceImages = [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop", // Plumbing
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop", // Electrical
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop", // Cleaning
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop", // Carpentry
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070&auto=format&fit=crop", // Salon
    "/assets/ac_repair.png", // AC Repair
    "/assets/painting.png", // Painting
    "/assets/movers.png", // Packers & Movers
    "/assets/pest_control.png", // Pest Control
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop"  // Appliance Repair
];

const serviceLabels = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Salon & Beauty', 'AC Repair', 'Home Painting', 'Packers & Movers', 'Pest Control', 'Appliance Repair'];

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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 bg-slate-50">
            {/* Professional Background Slider */}
            <div className="absolute inset-0 z-0">
                {serviceImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-40' : 'opacity-0'}`}
                    >
                        <img src={img} alt="Service" className="w-full h-full object-cover" />
                    </div>
                ))}
                <div className="absolute inset-0 mesh-gradient opacity-10 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-linear-to-b from-white/20 via-white/40 to-slate-50"></div>
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                {serviceImages.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`transition-all duration-500 rounded-full ${idx === currentImageIndex ? 'w-10 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
                    />
                ))}
            </div>

            {/* Service label */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-fade-in">
                    {serviceLabels[currentImageIndex]}
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full animate-fade-in">
                {/* Admin badge */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2.5 px-5 py-2 bg-white/60 border border-slate-200 backdrop-blur-md rounded-full shadow-xl">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Secure Admin Access</span>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white p-10 text-slate-900">
                    <div className="text-center mb-10">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-slate-100 p-4 transition-transform hover:scale-110 duration-500">
                                <img
                                    src="/logo-v2.png"
                                    alt="PrimeSewa"
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <span className="text-4xl font-black text-slate-950 tracking-tighter italic">PrimeSewa</span>
                            <span className="text-[10px] font-black text-primary mt-2 uppercase tracking-[0.25em]">Command Center</span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Authorized Personnel Only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Identifier</label>
                            <div className="relative group grayscale transition-all hover:grayscale-0">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <input
                                    type="text"
                                    value="admin-root"
                                    readOnly
                                    disabled
                                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-400 cursor-not-allowed font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                                <input
                                    type="password"
                                    value={pwd}
                                    onChange={e => setPwd(e.target.value)}
                                    className="w-full pl-14 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 tracking-[0.5rem] font-bold placeholder-slate-200 transition-all shadow-sm"
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 text-center mt-2">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Dev Mode: Use <span className="text-slate-900">••••</span></p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 text-sm font-bold animate-fade-in shadow-sm">
                                <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 mt-4 hover-lift shadow-2xl group ${loading
                                ? 'bg-primary/50 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Authenticating...
                                </span>
                            ) : (
                                <>
                                    Establish Master Session
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
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
