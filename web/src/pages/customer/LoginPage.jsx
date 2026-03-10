import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { auth, db } from '../../firebase/config';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { Phone, ShieldCheck } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const serviceImages = [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070&auto=format&fit=crop",
];

const serviceLabels = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Salon & Beauty'];

const LoginPage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % serviceImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => { }
            });
        }
        return () => {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (phoneNumber.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
        if (customerName.trim().length < 2) { setError('Please enter your full name'); return; }
        setIsLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            window.confirmationResult = confirmation;
            setConfirmationResult(confirmation);
            setStep(2);
        } catch (err) {
            console.error("Error SMS", err);
            if (err.message && (err.message.includes('billing-not-enabled') || err.message.includes('auth/'))) {
                setConfirmationResult('DEV_MODE');
                setStep(2);
            } else {
                setError(err.message || 'Failed to send OTP. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            let user;
            if (confirmationResult === 'DEV_MODE') {
                if (otp !== '1234') throw new Error("Invalid Dev OTP");
                user = { uid: `dev-cust-${phoneNumber}`, phoneNumber: `+91${phoneNumber}` };
            } else {
                const result = await confirmationResult.confirm(otp);
                user = result.user;
            }
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            let userDataObj = {
                uid: user.uid,
                name: customerName,
                phone: `+91${phoneNumber}`,
                role: 'customer',
                createdAt: serverTimestamp()
            };
            if (!docSnap.exists()) {
                await setDoc(userDocRef, userDataObj);
            } else {
                const existingData = docSnap.data();
                if (existingData.name && existingData.name.toLowerCase() === customerName.toLowerCase()) {
                    userDataObj = { ...existingData, uid: user.uid };
                } else {
                    userDataObj = { ...existingData, ...userDataObj, uid: user.uid };
                }
            }
            if (userDataObj.status === 'blocked') {
                await signOut(auth);
                setError('Your account has been blocked. Please contact support.');
                setIsLoading(false);
                return;
            }
            setCurrentUser(user);
            setUserData(userDataObj);

            // The useEffect on /dashboard (CustomerHome) will pick up the session and reopen the form
            navigate('/dashboard');
        } catch (err) {
            console.error("OTP Verify Error", err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/50 via-[#0B0F19]/70 to-[#0B0F19]/95"></div>
            </div>

            {/* Service dot indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                {serviceImages.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`transition-all duration-300 rounded-full ${idx === currentImageIndex ? 'w-8 h-2 bg-blue-400' : 'w-2 h-2 bg-white/30 hover:bg-white/50'}`}
                    />
                ))}
            </div>

            {/* Current service label */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    {serviceLabels[currentImageIndex]}
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 text-white">
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center justify-center mb-5">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-600/30">
                                <img
                                    src="/logo-v2.png"
                                    alt="PrimeSewa"
                                    className="h-10 object-contain"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <span className="text-3xl font-black text-white tracking-tighter">PrimeSewa</span>
                            <span className="text-xs font-medium text-blue-400 mt-1 uppercase tracking-widest">Home Services Platform</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            {step === 1 ? 'Welcome Back' : 'Verify OTP'}
                        </h2>
                        <p className="text-white/50 text-sm mt-1">
                            {step === 1
                                ? 'Book verified home service professionals'
                                : `Code sent to +91 ${phoneNumber}`}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-white placeholder-white/20 outline-none"
                                    placeholder="E.g., Rahul Desai"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">+91</span>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-white placeholder-white/20 outline-none"
                                        placeholder="98765 43210"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 mt-2 ${isLoading
                                    ? 'bg-blue-600/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 hover:-translate-y-0.5'
                                    }`}
                            >
                                {isLoading ? 'Sending OTP...' : (<><Phone className="w-4 h-4" /> Send OTP</>)}
                            </button>

                            <div className="pt-4 border-t border-white/10">
                                <p className="text-center text-xs text-white/40 mb-3">Are you a service provider?</p>
                                <div className="flex gap-3">
                                    <Link
                                        to="/provider/login?signup=true"
                                        className="flex-1 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-bold rounded-xl text-center border border-indigo-500/20 transition-all"
                                    >
                                        Join as Partner
                                    </Link>
                                    <Link
                                        to="/provider/login"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-xl text-center border border-white/10 transition-all"
                                    >
                                        Partner Login
                                    </Link>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Enter OTP</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={4}
                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-black text-center tracking-[1rem] text-2xl text-white placeholder-white/20 outline-none"
                                    placeholder="••••"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                />
                                <p className="text-center text-xs text-white/30 mt-3">
                                    For testing: use code <span className="text-blue-400 font-bold">1234</span>
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${isLoading
                                    ? 'bg-blue-600/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 hover:-translate-y-0.5'
                                    }`}
                            >
                                {isLoading ? 'Verifying...' : (<><ShieldCheck className="w-4 h-4" /> Verify &amp; Login</>)}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                className="w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors"
                            >
                                ← Back to Phone
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <div id="recaptcha-container" className="hidden"></div>
        </div>
    );
};

export default LoginPage;
