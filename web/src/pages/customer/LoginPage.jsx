import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { auth, db } from '../../firebase/config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const LoginPage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1 = phone, 2 = otp
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Initialize recaptcha when component mounts
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                }
            });
        }

        // Cleanup on unmount
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

        if (phoneNumber.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        if (customerName.trim().length < 2) {
            setError('Please enter your full name');
            return;
        }

        setIsLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            window.confirmationResult = confirmation;
            setConfirmationResult(confirmation);
            setStep(2);
        } catch (err) {
            console.error("Error SMS", err);

            // Developer Fallback for Billing / Auth Errors
            if (err.message && (err.message.includes('billing-not-enabled') || err.message.includes('auth/'))) {
                console.warn('Firebase Auth issue detected. Falling back to Dev Mode.');
                setConfirmationResult('DEV_MODE');
                setStep(2);
                setError('Firebase Billing not enabled. Running in Dev Mode (Use OTP: 1234)');
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

            // Check if user exists in Firestore, if not create them
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
                userDataObj = { ...docSnap.data(), uid: user.uid };
            }

            setCurrentUser(user);
            setUserData(userDataObj);
            navigate('/customer/app');
        } catch (err) {
            console.error("OTP Verify Error", err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center bg-slate-900 border-t-4 border-blue-500 px-4 py-12">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-white">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="PrimeSewa Logo" className="w-auto h-16 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
                    <p className="text-slate-400 mt-2">Log in to book or manage services.</p>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium mb-4 text-white placeholder-slate-500"
                                placeholder="E.g., Rahul Desai"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />

                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-white placeholder-slate-500"
                                    placeholder="98765 43210"
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPhoneNumber(val);
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                        >
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Enter OTP</label>
                            <input
                                type="text"
                                required
                                maxLength={4}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-center tracking-widest text-lg text-white placeholder-slate-500"
                                placeholder="• • • •"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                            <p className="text-xs text-center text-slate-400 mt-3">
                                A 6-digit code has been sent to +91 {phoneNumber} <br />
                                <span className="font-semibold text-blue-400 mt-1 block">Dev Shortcut: Enter 1234 if SMS failed.</span>
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                        >
                            {isLoading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                    </form>
                )}
            </div>

            {/* Invisible reCAPTCHA container placed outside forms to prevent remount errors */}
            <div id="recaptcha-container" className="hidden"></div>
        </div>
    );
};

export default LoginPage;
