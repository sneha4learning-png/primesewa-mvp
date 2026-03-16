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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 bg-surface-900">
            {/* Professional Background Slider */}
            <div className="absolute inset-0 z-0">
                {serviceImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-30' : 'opacity-0'}`}
                    >
                        <img src={img} alt="Service" className="w-full h-full object-cover" />
                    </div>
                ))}
                <div className="absolute inset-0 mesh-gradient opacity-60 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-surface-900/50 to-surface-900"></div>
            </div>

            {/* Service dot indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                {serviceImages.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`transition-all duration-500 rounded-full ${idx === currentImageIndex ? 'w-10 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>

            {/* Current service label */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] animate-fade-in">
                    {serviceLabels[currentImageIndex]}
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full animate-fade-in">
                <div className="glass-card-dark rounded-[2.5rem] shadow-2xl border-white/10 p-10 text-white">
                    <div className="text-center mb-10">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/20 p-4 transition-transform hover:scale-110 duration-500">
                                <img
                                    src="/logo-v2.png"
                                    alt="PrimeSewa"
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <span className="text-4xl font-black text-white tracking-tighter">PrimeSewa</span>
                            <span className="text-[10px] font-black text-primary-light mt-2 uppercase tracking-[0.25em]">Premium Service Marketplace</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                            {step === 1 ? 'Welcome Back' : 'Security Verification'}
                        </h2>
                        <p className="text-white/40 text-sm font-medium">
                            {step === 1
                                ? 'Access your portal to book premium services'
                                : `Verification code sent to +91 ${phoneNumber}`}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none"
                                    placeholder="Enter your name"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Mobile Number</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-light/50 font-black text-sm">+91</span>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none"
                                        placeholder="Phone number"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 mt-4 hover-lift shadow-2xl ${isLoading
                                    ? 'bg-primary/50 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                                    }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Sending Code...
                                    </span>
                                ) : (<><Phone className="w-5 h-5" /> Get Access Code</>)}
                            </button>

                            <div className="pt-8 border-t border-white/5 mt-4">
                                <p className="text-center text-[10px] font-black text-white/20 mb-5 uppercase tracking-widest">Partner Channels</p>
                                <div className="flex gap-4">
                                    <Link
                                        to="/provider/login?signup=true"
                                        className="flex-1 py-4 bg-primary/10 hover:bg-primary/20 text-primary-light text-[10px] font-black rounded-2xl text-center border border-primary/20 transition-all uppercase tracking-widest"
                                    >
                                        Join us
                                    </Link>
                                    <Link
                                        to="/provider/login"
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black rounded-2xl text-center border border-white/10 transition-all uppercase tracking-widest"
                                    >
                                        Portal
                                    </Link>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Enter Verification Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={4}
                                    className="w-full px-4 py-5 bg-white/5 border border-white/10 rounded-3xl focus:ring-2 focus:ring-primary transition-all font-black text-center tracking-[1.5rem] text-3xl text-white placeholder-white/5 outline-none"
                                    placeholder="••••"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                />
                                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                                    <p className="text-center text-[10px] font-bold text-primary-light uppercase tracking-widest">
                                        Dev Mode: Use <span className="text-white">1234</span>
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 hover-lift shadow-2xl ${isLoading
                                        ? 'bg-primary/50 cursor-not-allowed'
                                        : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                                        }`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Establishing...
                                        </span>
                                    ) : (<><ShieldCheck className="w-5 h-5" /> Establish Session</>)}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                    className="w-full py-2 text-[10px] font-black text-white/20 hover:text-white/40 transition-colors uppercase tracking-[0.2em]"
                                >
                                    ← Change Number
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <div id="recaptcha-container" className="hidden"></div>
        </div>
    );
};

export default LoginPage;
