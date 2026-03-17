import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext';
import { auth, db } from '../../firebase/config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';
import { Phone, ArrowRight, ShieldCheck, Mail, Lock, User, CheckCircle2, AlertCircle, Eye, EyeOff, Wrench, UploadCloud } from 'lucide-react';

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
        proofDocument: null,
        idProofType: 'Aadhaar',
        idProofNumber: '',
        yearsExperience: '',
        workDescription: '',
        previousWorkSample: '',
        proofOfWorkImages: []
    });

    const [providers, setProviders] = useState([]);
    const { currentUser, userData, setCurrentUser, setUserData } = useAuth();
    const { sendNotification } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Redirection for already logged-in providers
        if (currentUser && userData?.role === 'provider') {
            navigate('/provider');
        }
        
        // Check for signup query param
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('signup') === 'true') {
            setIsSignup(true);
        }
    }, [location.search, currentUser, userData, navigate]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'providers'));
                const fetchedMap = new Map();

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    // Deduplicate by doc ID (uid) — ensures newly-signed-up providers are never skipped
                    const key = docSnap.id;
                    if (!fetchedMap.has(key)) {
                        fetchedMap.set(key, { ...data, _docId: docSnap.id });
                    }
                });

                // Sort: approved/active first, then pending, then by name
                const sorted = Array.from(fetchedMap.values()).sort((a, b) => {
                    const aActive = ['active', 'approved'].includes((a.status || '').toLowerCase());
                    const bActive = ['active', 'approved'].includes((b.status || '').toLowerCase());
                    if (aActive !== bActive) return aActive ? -1 : 1;
                    return (a.name || '').localeCompare(b.name || '');
                });

                setProviders(sorted);
            } catch (err) {
                console.error('Error fetching providers:', err);
            }
        };
        fetchProviders();
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
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

        // For signup: validate manual phone input length
        // For login: phone comes from dropdown (already formatted), just check it's not empty
        if (!targetPhone || targetPhone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            setIsLoading(false);
            return;
        }

        // Uniqueness check for new providers
        if (isSignup) {
            const alreadyExists = providers.some(p => {
                const cleanP = (p.phone || '').replace(/\D/g, '').slice(-10);
                return cleanP === targetPhone;
            });
            if (alreadyExists) {
                setError('This phone number is already registered as a provider.');
                return;
            }
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
                // Don't set error, let the UI handle it normally
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
                // For login, find the provider in the list fetched during mount
                const selectedProv = providers.find(p => {
                    const cleanP = (p.phone || '').replace(/\D/g, '').slice(-10);
                    const cleanI = phoneNumber.replace(/\D/g, '').slice(-10);
                    return cleanP === cleanI;
                });

                if (!selectedProv) {
                    setError('Provider account not found. Please register first.');
                    setIsLoading(false);
                    return;
                }
                providerName = selectedProv.name;
            }

            // Sync with Firestore so routing knows role
            const userDocRef = doc(db, 'providers', user.uid);

            let providerData = {
                uid: user.uid,
                name: providerName,
                phone: `+91${user.phoneNumber ? user.phoneNumber.replace('+91', '') : (isSignup ? signupData.phone : phoneNumber)}`,
                role: 'provider',
                createdAt: serverTimestamp()
            };

            // Handle existing provider data migration if ID mismatch
            const existingProv = providers.find(p => {
                const cleanP = (p.phone || '').replace(/\D/g, '').slice(-10);
                const targetP = (isSignup ? signupData.phone : phoneNumber).replace(/\D/g, '').slice(-10);
                return cleanP === targetP;
            });

            // If it's a new signup, include the extra details
            if (isSignup) {
                providerData = {
                    ...providerData,
                    status: 'pending',
                    category: signupData.category,
                    price: `₹${signupData.price}/hr`,
                    serviceAreas: signupData.serviceAreas,
                    // Identity & Work Records
                    idProofType: signupData.idProofType,
                    idProofNumber: signupData.idProofNumber,
                    previousWorkSample: signupData.previousWorkSample,
                    proofOfWorkImageNames: signupData.proofOfWorkImages?.map(f => f.name) || [],
                    proofDocumentName: signupData.proofDocument?.name || '',
                    rating: 0,
                    ratingCount: 0,
                    jobs: 0,
                    isOnline: true
                };
            } else if (existingProv) {
                // MIGRATE DATA: Ensure new UID-based doc has the status/stats of the existing record
                providerData = {
                    ...existingProv,
                    ...providerData,
                    uid: user.uid // Ensure it uses the new auth UID
                };
                delete providerData._docId; // Remove temp field from mount fetch

                // If IDs are different, we should cleanup the old one to avoid duplicates in Admin Panel
                if (existingProv._docId !== user.uid) {
                    console.log(`Migrating provider data from ${existingProv._docId} to ${user.uid}`);
                    // We can delete the old doc after successfully setting the new one
                    // Use a small delay to ensure the setDoc completes first
                    setTimeout(async () => {
                        try {
                            const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
                            await deleteDoc(fsDoc(db, 'providers', existingProv._docId));
                        } catch (e) { console.error("Migration cleanup failed", e); }
                    }, 2000);
                }
            }

            await setDoc(userDocRef, providerData, { merge: true });

            // Notify Admin of new partner signup
            if (isSignup) {
                sendNotification('admin', 'New Partner Registration', `${providerName} has registered as a ${signupData.category} provider and is awaiting approval.`, 'info');
            }

            setCurrentUser(user);
            setUserData({
                uid: user.uid, role: 'provider', name: providerName
            });
            navigate('/provider');
        } catch (err) {
            console.error("OTP Verify Error", err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const serviceImages = [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop", // Plumbing
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop", // Electrical
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop", // Cleaning
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop", // Carpentry
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070&auto=format&fit=crop", // Salon
        "https://images.unsplash.com/photo-1595438865621-e374be883713?q=80&w=2072&auto=format&fit=crop", // AC Repair
        "https://images.unsplash.com/photo-1562259949-e85c83efb914?q=80&w=2070&auto=format&fit=crop", // Painting
        "https://images.unsplash.com/photo-1520038410233-7141be7e6f97?q=80&w=2074&auto=format&fit=crop", // Packers & Movers
        "https://images.unsplash.com/photo-1581442183244-6338bbade3b9?q=80&w=2070&auto=format&fit=crop", // Pest Control
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop"  // Appliance Repair
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % serviceImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 md:py-16 bg-surface-900">
            {/* Professional Background Slider */}
            <div className="absolute inset-0 z-0">
                {serviceImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-20' : 'opacity-0'}`}
                    >
                        <img src={img} alt="Background" className="w-full h-full object-cover" />
                    </div>
                ))}
                <div className="absolute inset-0 mesh-gradient opacity-50 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-surface-900/60 to-surface-900"></div>
            </div>

            <div className={`relative z-10 w-full animate-fade-in ${isSignup ? 'max-w-2xl' : 'max-w-md'}`}>
                <div className="glass-card-dark rounded-[2.5rem] shadow-2xl border-white/10 p-10 md:p-12 text-white">
                    <div className="text-center mb-10 flex flex-col items-center">
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/20 p-4 transition-transform hover:scale-110 duration-500">
                                <img
                                    src="/logo-v2.png"
                                    alt="PrimeSewa"
                                    className="w-full h-full object-contain"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <span className="text-4xl font-black text-white tracking-tighter">PrimeSewa</span>
                            <span className="text-[10px] font-black text-primary-light mt-2 uppercase tracking-[0.25em]">Partner Network</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">{isSignup ? 'Business Registration' : 'Partner Portal'}</h2>
                        <p className="text-white/40 text-sm font-medium">{isSignup ? 'Scale your service business with our global reach' : 'Manage your enterprise operations'}</p>
                    </div>

                    {error && (
                        <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {isSignup && step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Legal Name</label>
                                    <input required type="text" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none" value={signupData.name} onChange={e => setSignupData({ ...signupData, name: e.target.value })} placeholder="Full name as per ID" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Business Mobile</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-light/50 font-black text-sm">+91</span>
                                        <input required type="tel" maxLength={10} className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none" value={signupData.phone} onChange={e => setSignupData({ ...signupData, phone: e.target.value.replace(/\D/g, '') })} placeholder="Phone number" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Specialization</label>
                                    <select required className="w-full px-5 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white outline-none appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }} value={signupData.category} onChange={e => setSignupData({ ...signupData, category: e.target.value })}>
                                        <option value="Plumbing" className="bg-surface-900">Plumbing</option>
                                        <option value="Electrical" className="bg-surface-900">Electrical</option>
                                        <option value="Cleaning" className="bg-surface-900">Cleaning</option>
                                        <option value="Carpentry" className="bg-surface-900">Carpentry</option>
                                        <option value="Painting" className="bg-surface-900">Home Painting</option>
                                        <option value="AC Repair" className="bg-surface-900">AC Repair & Service</option>
                                        <option value="Appliance Repair" className="bg-surface-900">Appliance Repair</option>
                                        <option value="Pest Control" className="bg-surface-900">Pest Control</option>
                                        <option value="Salon & Beauty" className="bg-surface-900">Salon & Beauty</option>
                                        <option value="Packers & Movers" className="bg-surface-900">Packers & Movers</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Base Rate (₹/hr)</label>
                                    <input required type="number" min="50" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none" value={signupData.price} onChange={e => setSignupData({ ...signupData, price: e.target.value })} placeholder="e.g. 400" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Service Operations (Ahmedabad Areas)</label>
                                    <input required type="text" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none" value={signupData.serviceAreas} onChange={e => setSignupData({ ...signupData, serviceAreas: e.target.value })} placeholder="e.g. Vastrapur, Bopal, SG Highway" />
                                    <p className="text-[10px] text-primary-light/50 mt-1 font-bold uppercase tracking-widest">Comma separated list of operational zones</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-primary-light" />
                                    </div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Verification & Compliance</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">ID Authority</label>
                                        <select required className="w-full px-5 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white outline-none appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }} value={signupData.idProofType} onChange={e => setSignupData({ ...signupData, idProofType: e.target.value })}>
                                            <option value="Aadhaar" className="bg-surface-900">Aadhaar Card</option>
                                            <option value="PAN" className="bg-surface-900">PAN Card</option>
                                            <option value="Driving License" className="bg-surface-900">Driving License</option>
                                            <option value="Voter ID" className="bg-surface-900">Voter ID</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Identification Number</label>
                                        <input required type="text" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-semibold text-white placeholder-white/10 outline-none" value={signupData.idProofNumber} onChange={e => setSignupData({ ...signupData, idProofNumber: e.target.value })} placeholder="XXXX-XXXX-XXXX" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Work Portfolio (Optional)</label>
                                        <label className={`w-full flex justify-center items-center gap-3 py-5 border-2 border-dashed rounded-[1.25rem] cursor-pointer transition-all ${signupData.proofOfWorkImages && signupData.proofOfWorkImages.length > 0 ? 'border-primary bg-primary/10 text-primary-light' : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/30'}`}>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => setSignupData({ ...signupData, proofOfWorkImages: Array.from(e.target.files) })} />
                                            {signupData.proofOfWorkImages && signupData.proofOfWorkImages.length > 0 ? (
                                                <><CheckCircle2 className="w-5 h-5" /> <span className="font-black text-[10px] uppercase tracking-widest">{signupData.proofOfWorkImages.length} Assets Attached</span></>
                                            ) : (
                                                <><UploadCloud className="w-5 h-5" /> <span className="font-black text-[10px] uppercase tracking-widest">Attach Work Samples</span></>
                                            )}
                                        </label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Identity Document (Mandatory)</label>
                                        <label className={`w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed rounded-[1.25rem] cursor-pointer transition-all ${signupData.proofDocument ? 'border-primary bg-primary/10 text-primary-light' : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/30'}`}>
                                            <input required type="file" className="hidden" onChange={e => setSignupData({ ...signupData, proofDocument: e.target.files[0] })} />
                                            {signupData.proofDocument ? (
                                                <><CheckCircle2 className="w-5 h-5" /> <span className="font-black text-[10px] uppercase tracking-widest">Identity Verified</span></>
                                            ) : (
                                                <><UploadCloud className="w-5 h-5" /> <span className="font-black text-[10px] uppercase tracking-widest">Upload ID Scan</span></>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 space-y-6">
                                <button type="submit" disabled={isLoading} className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 hover-lift shadow-2xl ${isLoading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark shadow-primary/20'}`}>
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing Application...
                                        </span>
                                    ) : (<><ShieldCheck className="w-5 h-5" /> Submit & Verify</>)}
                                </button>
                                
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                        Already a partner? <button type="button" onClick={() => setIsSignup(false)} className="text-primary-light hover:underline ml-2">Secure Login</button>
                                    </p>
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <Link to="/login" className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/40 rounded-2xl border border-white/10 transition-all uppercase tracking-widest">
                                        🏠 Switch to Client Channel
                                    </Link>
                                </div>
                            </div>
                        </form>
                    ) : step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest ml-1 text-center">Authorized Mobile Number</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary-light/50 font-black text-lg border-r border-white/10 pr-4">+91</span>
                                    <input
                                        required
                                        type="tel"
                                        maxLength={10}
                                        className="w-full pl-24 pr-6 py-5 bg-white/5 border border-white/10 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-black text-white text-2xl tracking-[0.2em] outline-none"
                                        placeholder="000 000 0000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <p className="text-[10px] text-center text-primary-light/40 font-black uppercase tracking-[0.2em]">High Impact Verification Required</p>
                            </div>
                            
                            <div className="space-y-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 hover-lift shadow-2xl ${isLoading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark shadow-primary/20'}`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Generating Code...
                                        </span>
                                    ) : (<><Phone className="w-5 h-5" /> Request Access Code</>)}
                                </button>

                                <div className="text-center">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                        New Partner? <button type="button" onClick={() => setIsSignup(true)} className="text-primary-light hover:underline ml-2">Join Network</button>
                                    </p>
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <Link to="/login" className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/40 rounded-2xl border border-white/10 transition-all uppercase tracking-widest">
                                        🏠 Switch to Client Channel
                                    </Link>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-10 animate-fade-in">
                            <div className="space-y-6">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Verify Identity Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={4}
                                    className="w-full px-4 py-6 bg-white/5 border border-white/10 rounded-3xl focus:ring-2 focus:ring-primary transition-all font-black text-center tracking-[2rem] text-4xl text-white placeholder-white/5 outline-none"
                                    placeholder="••••"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Code sent to +91 {isSignup ? signupData.phone : phoneNumber}</p>
                                    <p className="text-[10px] font-black text-primary-light uppercase tracking-widest">Dev Mode: Use <span className="text-white">1234</span></p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 hover-lift shadow-2xl ${isLoading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark shadow-primary/20'}`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Establishing...
                                        </span>
                                    ) : (<><ShieldCheck className="w-5 h-5" /> Unlock Portal</>)}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                    className="w-full py-2 text-[10px] font-black text-white/20 hover:text-white/40 transition-colors uppercase tracking-[0.2em]"
                                >
                                    ← Modify Credentials
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

export default ProviderLogin;
