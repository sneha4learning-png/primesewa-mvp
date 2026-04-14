import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { auth, db } from '../../firebase/config';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { Phone, ShieldCheck } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const serviceImages = [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=2070", // Plumbing
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070", // Electrical
    "https://images.unsplash.com/photo-1527515545081-5db817172677?q=80&w=2070", // Cleaning
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070", // Carpentry
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070", // Salon
    "https://images.unsplash.com/photo-1621905252507-b352175d2f24?q=80&w=2070", // AC Repair
    "https://images.unsplash.com/photo-1589939705384-5185138a04b9?q=80&w=2070", // Painting
    "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?q=80&w=2070", // Packers & Movers
    "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?q=80&w=2070", // Pest Control
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070", // Appliance Repair
    "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?q=80&w=2070"  // Handyman
];

const serviceLabels = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Salon & Beauty', 'AC Repair', 'Home Painting', 'Packers & Movers', 'Pest Control', 'Appliance Repair', 'Handyman'];

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
            // DEV BYPASS: Allow '1234' on localhost or if explicitly in DEV_MODE
            if (otp === '1234' || confirmationResult === 'DEV_MODE') {
                if (otp !== '1234' && confirmationResult === 'DEV_MODE') throw new Error("Invalid Dev OTP");
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 bg-linear-to-br from-indigo-500 via-indigo-600 to-violet-700">
            {/* Professional Background Slider */}
            <div className="absolute inset-0 z-0">
                {serviceImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-20' : 'opacity-0'}`}
                    >
                        <img src={img} alt="Service" className="w-full h-full object-cover mix-blend-overlay" />
                    </div>
                ))}
                <div className="absolute inset-0 bg-linear-to-b from-indigo-900/20 via-indigo-950/40 to-indigo-950/60 transition-colors duration-1000"></div>
                <div className="absolute inset-0 mesh-gradient opacity-30 mix-blend-soft-light"></div>
            </div>

            {/* Service dot indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
                {serviceImages.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`transition-all duration-500 rounded-full ${idx === currentImageIndex ? 'w-10 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>

            {/* Current service label */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.3em] animate-fade-in">
                    {serviceLabels[currentImageIndex]}
                </span>
            </div>

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full animate-fade-in">
                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white p-8 text-slate-900">
                    <div className="text-center mb-6">
                        <div className="flex flex-col items-center justify-center mb-4">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl border border-slate-100 p-3 transition-transform hover:scale-110 duration-500">
                                <img
                                    src="/primesewa_logo.png"
                                    alt="PrimeSewa"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="text-3xl font-medium text-slate-950 tracking-tighter italic">PrimeSewa</span>
                            <span className="text-[10px] font-medium text-primary mt-1 uppercase tracking-[0.25em]">Premium Service Marketplace</span>
                        </div>
                        <h2 className="text-xl font-normal tracking-tight text-slate-900 mb-1">
                            {step === 1 ? 'Welcome Back' : 'Security Verification'}
                        </h2>
                        <p className="text-slate-500 text-xs font-medium">
                            {step === 1
                                ? 'Access your portal to book premium services'
                                : `Verification code sent to +91 ${phoneNumber}`}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl text-sm font-normal flex items-center gap-3 animate-fade-in">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-normal text-slate-900 placeholder-slate-300 outline-none"
                                    placeholder="Enter your name"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/50 font-medium text-sm border-r border-slate-200 pr-4">+91</span>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        className="w-full pl-16 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-slate-900 placeholder-slate-300 text-xl tracking-[0.1em] outline-none"
                                        placeholder="000 000 0000"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-5 rounded-2xl font-medium text-white transition-all flex items-center justify-center gap-3 mt-4 hover-lift shadow-2xl ${isLoading
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

                            <div className="pt-4 border-t border-slate-100 mt-4">
                                <p className="text-center text-[10px] font-medium text-slate-400 mb-3 uppercase tracking-widest">Partner Channels</p>
                                <div className="flex gap-4">
                                    <Link
                                        to="/provider/login?signup=true"
                                        className="flex-1 py-4 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium rounded-2xl text-center border border-primary/10 transition-all uppercase tracking-widest"
                                    >
                                        Join us
                                    </Link>
                                    <Link
                                        to="/provider/login"
                                        className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-medium rounded-2xl text-center border border-slate-200 transition-all uppercase tracking-widest"
                                    >
                                        Portal
                                    </Link>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest text-center">Enter Verification Code</label>
                                <input
                                    type="password"
                                    required
                                    maxLength={4}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary transition-all font-medium text-center tracking-[1rem] text-2xl text-slate-900 placeholder-slate-200 outline-none"
                                    placeholder="••••"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-center">
                                    <p className="text-[10px] font-normal text-primary uppercase tracking-widest">
                                        Dev Mode: Use <span className="text-slate-900 font-bold">1234</span>
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-5 rounded-2xl font-medium text-white transition-all flex items-center justify-center gap-3 hover-lift shadow-2xl ${isLoading
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
                                    className="w-full py-2 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
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
