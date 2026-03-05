import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { ShieldAlert } from 'lucide-react';

const AdminLogin = () => {
    const [pwd, setPwd] = useState('');
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // Developer Mock Login Utility
        if (pwd === 'admin') {
            setCurrentUser({ uid: 'mock-admin', phoneNumber: '+919999999999' });
            setUserData({ uid: 'mock-admin', role: 'admin' });
            navigate('/admin');
        } else {
            alert('Invalid Admin Credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 border-t-4 border-blue-500 px-4">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-white">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin System</h2>
                    <p className="text-slate-400 mt-2">Authorized Access Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Master Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white placeholder-slate-500 font-medium tracking-wider"
                            placeholder="••••••••"
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                        />
                        <p className="text-xs text-center text-slate-500 mt-3">
                            <span className="font-semibold text-blue-400">Dev Note:</span> Password is 'admin'.
                        </p>
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-blue-500/30"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
