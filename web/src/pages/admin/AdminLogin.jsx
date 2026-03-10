import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { Lock, User, ShieldAlert, ArrowRight, Wrench } from 'lucide-react';

const AdminLogin = () => {
    const [pwd, setPwd] = useState('');
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Security Validation (viva-v2)
        if (pwd === 'admin') {
            const adminUser = { uid: 'admin-master', role: 'admin', name: 'Super Admin' };
            setCurrentUser(adminUser);
            setUserData(adminUser);
            navigate('/admin');
        } else {
            setError('Unauthorized: Credentials invalid.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 border-t-4 border-blue-500 px-4">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-white">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center mb-6">
                        <img src="/logo-v2.png" alt="PrimeSewa" className="h-16 object-contain mb-4 animate-float drop-shadow-2xl" />
                        <span className="text-4xl font-black text-white tracking-tighter">PrimeSewa</span>
                    </div>
                    <h2 className="text-xl font-medium tracking-wide text-slate-400">Admin System</h2>
                    <p className="text-slate-400 mt-2">Authorized Access Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Access Key</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="password"
                                value={pwd}
                                onChange={(e) => setPwd(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white tracking-widest"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm animate-shake">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                    >
                        {loading ? 'Authenticating...' : (
                            <>
                                Establish Session
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
