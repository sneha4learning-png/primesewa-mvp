import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { auth, db } from '../../firebase/config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BriefcaseBusiness, UserPlus, UploadCloud, CheckCircle2 } from 'lucide-react';
import { getProviders, addProvider } from '../../utils/mockDb';

const ProviderLogin = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [isSignup, setIsSignup] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Signup specific fields
    const [signupData, setSignupData] = useState({
        name: '',
        phone: '',
        category: 'Plumbing',
        price: '',
        serviceAreas: '',
        proofDocument: null
    });

    const [providers, setProviders] = useState([]);
    const { setCurrentUser, setUserData } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const q = query(collection(db, 'providers'), where('status', '==', 'active'));
                const querySnapshot = await getDocs(q);
                const fetched = [];
                querySnapshot.forEach((doc) => fetched.push(doc.data()));
                setProviders(fetched);
            } catch (err) {
                console.error("Error fetching providers:", err);
            }
        };
        fetchProviders();
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

        const targetPhone = isSignup ? signupData.phone : phoneNumber;

        if (targetPhone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        if (isSignup && !signupData.proofDocument) {
            setError('Please upload an identity/proof document to proceed.');
            return;
        }

        setIsLoading(true);
        try {
            const formattedPhone = `+91${targetPhone}`;
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
                const targetPhone = isSignup ? signupData.phone : phoneNumber;
                user = { uid: `dev-prov-${targetPhone}`, phoneNumber: `+91${targetPhone}` };
            } else {
                const result = await confirmationResult.confirm(otp);
                user = result.user;
            }

            let providerName = '';

            if (isSignup) {
                providerName = signupData.name;
            } else {
                const cleanPhoneTarget = phoneNumber.replace('+91', '');
                const selectedProv = providers.find(p => p.phone.includes(cleanPhoneTarget));
                providerName = selectedProv ? selectedProv.name : 'Unknown Provider';
            }

            // Sync with Firestore so routing knows role
            const userDocRef = doc(db, 'providers', user.uid);

            let providerData = {
                uid: user.uid,
                name: providerName,
                phone: `+91${user.phoneNumber ? user.phoneNumber.replace('+91', '') : (isSignup ? signupData.phone : phoneNumber)}`,
                role: 'provider',
                status: isSignup ? 'pending' : 'active',
                createdAt: serverTimestamp()
            };

            // If it's a new signup, include the extra details
            if (isSignup) {
                providerData = {
                    ...providerData,
                    category: signupData.category,
                    price: `₹${signupData.price}/hr`,
                    serviceAreas: signupData.serviceAreas,
                    rating: 5.0,
                    jobs: 0
                };
            }

            await setDoc(userDocRef, providerData, { merge: true });

            setCurrentUser(user);
            setUserData({ uid: user.uid, role: 'provider', name: providerName });
            navigate('/provider');
        } catch (err) {
            console.error("OTP Verify Error", err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 border-t-4 border-blue-500 px-4 py-12">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-white">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/logo.png" alt="PrimeSewa Logo" className="h-12 w-auto drop-shadow-md" />
                        <span className="text-3xl font-bold text-white tracking-tight">PrimeSewa</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">{isSignup ? 'Become a Partner' : 'Partner Portal'}</h2>
                    <p className="text-slate-400 mt-2">{isSignup ? 'Join our fleet and start earning today.' : 'Manage your service requests & earnings.'}</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {isSignup && step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                            <input required type="text" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500" value={signupData.name} onChange={e => setSignupData({ ...signupData, name: e.target.value })} placeholder="e.g. Ramesh Singh" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                            <input required type="tel" maxLength={10} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500" value={signupData.phone} onChange={e => setSignupData({ ...signupData, phone: e.target.value })} placeholder="10-digit mobile number" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Service Category</label>
                            <select required className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white" value={signupData.category} onChange={e => setSignupData({ ...signupData, category: e.target.value })}>
                                <option value="Plumbing">Plumbing</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Carpentry">Carpentry</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Base Hourly Rate (₹)</label>
                            <input required type="number" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500" value={signupData.price} onChange={e => setSignupData({ ...signupData, price: e.target.value })} placeholder="e.g. 400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Service Areas (Ahmedabad)</label>
                            <input required type="text" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500" value={signupData.serviceAreas} onChange={e => setSignupData({ ...signupData, serviceAreas: e.target.value })} placeholder="e.g. Vastrapur, Bopal, SG Highway" />
                            <p className="text-xs text-slate-500 mt-1">Separate multiple areas with commas</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Identity / Proof Document</label>
                            <label className={`w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${signupData.proofDocument ? 'border-emerald-500 bg-emerald-900/40 text-emerald-400' : 'border-slate-600 bg-slate-900/50 hover:bg-slate-900 text-blue-400'}`}>
                                <input
                                    required
                                    type="file"
                                    className="hidden"
                                    onChange={e => setSignupData({ ...signupData, proofDocument: e.target.files[0] })}
                                />
                                {signupData.proofDocument ? (
                                    <><CheckCircle2 className="w-5 h-5" /> <span className="font-bold text-sm">Document Selected</span></>
                                ) : (
                                    <><UploadCloud className="w-5 h-5" /> <span className="font-bold text-sm">Click to Upload Document</span></>
                                )}
                            </label>
                            <p className="text-xs text-slate-500 mt-1">Aadhar, PAN, or Utility Bill (Max 5MB)</p>
                        </div>

                        <button type="submit" disabled={isLoading} className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white transition-all mt-6 ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                        <p className="text-center text-sm text-slate-400 mt-4">
                            Already a partner? <button type="button" onClick={() => setIsSignup(false)} className="text-blue-400 font-bold hover:underline">Log In</button>
                        </p>
                    </form>
                ) : step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Select Provider Account</label>
                            {providers.length > 0 ? (
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-white"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                >
                                    <option value="" disabled className="text-slate-500">Choose your account</option>
                                    {providers.map(p => {
                                        const phoneStr = p.phone.replace('+91', '');
                                        return <option key={p.phone} value={phoneStr}>{p.name} ({phoneStr})</option>;
                                    })}
                                </select>
                            ) : (
                                <p className="text-sm text-slate-400 bg-slate-900 border border-slate-700 p-3 rounded-xl">No active providers available at the moment.</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white transition-all ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isLoading ? 'Sending...' : 'Send Login Code'}
                        </button>
                        <p className="text-center text-sm text-slate-400 mt-4">
                            Want to join our platform? <button type="button" onClick={() => setIsSignup(true)} className="text-blue-400 font-bold hover:underline">Sign Up</button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Enter Verification Code</label>
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
                                A 6-digit code has been sent to +91 {isSignup ? signupData.phone : phoneNumber} <br />
                                <span className="font-semibold text-blue-400 mt-1 block">Dev Shortcut: Enter 1234 if SMS failed.</span>
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white transition-all ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isLoading ? 'Verifying...' : 'Verify & Access Dashboard'}
                        </button>
                    </form>
                )}
            </div>

            {/* Invisible reCAPTCHA container placed outside forms to prevent remount errors */}
            <div id="recaptcha-container" className="hidden"></div>
        </div>
    );
};

export default ProviderLogin;
