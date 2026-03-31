import { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserCircle, Star, StarHalf, Briefcase, Phone, Tag, MapPin, UploadCloud } from 'lucide-react';
import { updateDoc, doc as fsDoc } from 'firebase/firestore'; 

const ProviderProfile = () => {
    const { currentUser, userData } = useAuth();
    const [profile, setProfile] = useState(null);
    const [completedJobsCount, setCompletedJobsCount] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);

    const handlePhotoUpdate = async (e) => {
        const file = e.target.files[0];
        if (!file || !profile) return;

        setIsUpdating(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const docId = profile.uid || profile._docId;
                if (!docId) throw new Error("No document ID found");
                
                const provRef = fsDoc(db, 'providers', docId);
                await updateDoc(provRef, { photoURL: reader.result });
                setProfile(prev => ({ ...prev, photoURL: reader.result }));
                alert("Profile photo updated successfully!");
            } catch (err) {
                console.error("Error updating photo:", err);
                alert("Failed to update photo. Please try again.");
            } finally {
                setIsUpdating(false);
            }
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            // First check by UID if available, fallback to name matching for older docs
            if (userData?.uid) {
                try {
                    const q = query(collection(db, 'providers'), where('uid', '==', userData.uid));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                        return;
                    }
                } catch (e) {
                    console.error("Error fetching provider profile by UID:", e);
                }
            }

            // Name fallback
            const providerName = userData?.name || currentUser?.displayName;
            if (providerName) {
                try {
                    const q = query(collection(db, 'providers'), where('name', '==', providerName));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                    } else {
                        // Keep a pending profile state so UI doesn't crash if totally missing
                        setProfile({
                            name: providerName,
                            category: userData?.category || 'Service',
                            status: userData?.status || 'pending',
                            phone: userData?.phone || '',
                            serviceAreas: 'Across Ahmedabad',
                            jobs: 0,
                            rating: 0
                        });
                    }
                } catch (e) {
                    console.error("Error fetching provider profile by Name:", e);
                }
            }
        };

        const fetchCompletedJobs = async () => {
            const providerName = userData?.name || currentUser?.displayName;
            if (!providerName) return;

            try {
                const q = query(
                    collection(db, 'bookings'),
                    where('provider', '==', providerName),
                    where('status', '==', 'completed')
                );
                const querySnapshot = await getDocs(q);
                setCompletedJobsCount(querySnapshot.size);
            } catch (e) {
                console.error("Error fetching completed jobs count:", e);
            }
        };

        fetchProfile();
        fetchCompletedJobs();
    }, [currentUser, userData]);

    if (!profile) return <div className="p-8 text-center">Loading Profile...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <UserCircle className="w-6 h-6 text-indigo-600" /> Account Profile
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-900 px-8 py-10 text-center flex flex-col items-center relative">
                    <div className="relative group/avatar cursor-pointer">
                        <div className={`w-28 h-28 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-2xl border-4 border-indigo-200 overflow-hidden relative transition-all duration-500 group-hover/avatar:ring-4 group-hover/avatar:ring-white/50 ${isUpdating ? 'animate-pulse' : ''}`}>
                            {profile.photoURL ? (
                                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                profile.name?.charAt(0) || 'P'
                            )}
                        </div>
                        {/* PERSISTENT CAMERA ICON FOR BETTER PROVISION VISIBILITY */}
                        <label htmlFor="p-profile-photo" className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg cursor-pointer transform transition-all group-hover/avatar:scale-110 active:scale-95 z-20">
                            <UploadCloud className="w-5 h-5 text-white" />
                        </label>
                        <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                            <span className="text-[10px] text-white font-black uppercase tracking-widest">Update Photo</span>
                        </div>
                        <input 
                            type="file" 
                            id="p-profile-photo" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handlePhotoUpdate}
                            disabled={isUpdating}
                        />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-white tracking-wide">{profile.name}</h2>
                    <p className="text-indigo-200 flex items-center gap-1 mt-1 font-medium">
                        <Tag className="w-4 h-4" /> {profile.category} Service Partner
                    </p>
                    <div className="absolute top-4 right-4 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-white/20 rounded-full transition-all">
                        {profile.status === 'active' ? (
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm
                                ${profile.isOnline 
                                    ? 'bg-emerald-500 text-white border-emerald-400' 
                                    : 'bg-rose-500 text-white border-rose-400 opacity-90'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full bg-white mr-2 ${profile.isOnline ? 'animate-pulse' : ''}`} />
                                {profile.isOnline ? 'Online' : 'Offline'}
                            </span>
                        ) : (
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm
                                ${profile.status === 'pending' ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-700 text-white border-slate-600'}`}>
                                {profile.status}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Business Details</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Service Category</p>
                                        <p className="font-bold text-gray-900">{profile.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Jobs Completed</p>
                                        <p className="font-bold text-gray-900">{completedJobsCount} Jobs</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Operating Areas</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {profile.serviceAreas && profile.serviceAreas.length > 0 ? (
                                                (typeof profile.serviceAreas === 'string' ? profile.serviceAreas.split(',') : profile.serviceAreas).map((area, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200">{area.trim()}</span>
                                                ))
                                            ) : (
                                                <span className="text-gray-900 text-sm font-bold">Across Ahmedabad</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Contact & Ratings</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Registered Phone</p>
                                        <p className="font-bold text-gray-900">+91 {profile.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Customer Rating</p>
                                        {(profile.rating > 0 && (profile.ratingCount || 0) > 0) ? (
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900">{Number(profile.rating).toFixed(1)} / 5.0</p>
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => {
                                                        const starValue = i + 1;
                                                        const rating = profile.rating || 0;
                                                        if (rating >= starValue) {
                                                            return <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />;
                                                        } else if (rating >= starValue - 0.5) {
                                                            return <StarHalf key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />;
                                                        } else {
                                                            return <Star key={i} className="w-4 h-4 text-gray-300" />;
                                                        }
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-400 mt-1">New Partner (No ratings yet)</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 pb-2">Identity Verification</h3>
                        <div className="flex flex-col items-center sm:items-start gap-4">
                            <div className="w-full max-w-[240px] min-h-[160px] bg-slate-100 rounded-xl flex flex-col items-center justify-center border border-dashed border-gray-300 gap-3 transition-transform hover:scale-[1.02]">
                                {(typeof profile.proofDocument === 'string' && profile.proofDocument.startsWith('http')) ? (
                                    <img
                                        src={profile.proofDocument}
                                        alt="ID Proof"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <>
                                        <div className="p-4 bg-white rounded-full text-indigo-300 shadow-sm">
                                            <Briefcase className="w-8 h-8" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">Identity Verification<br />Pending Upload</p>
                                    </>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">{profile.idProofType || 'Aadhaar'} Number</p>
                                <p className="text-sm text-gray-600 font-medium">{profile.idProofNumber || 'XXXX-XXXX-XXXX'}</p>
                                {(!(typeof profile.proofDocument === 'string' && profile.proofDocument.startsWith('http'))) && (
                                    <p className="text-[10px] text-amber-600 mt-2 font-bold italic bg-amber-50 px-2 py-1 rounded inline-block">Verification Document Pending (Showing Sample)</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 shadow-inner group">
                            <div className="flex items-center gap-4 text-center sm:text-left">
                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                    <UserCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">Personal Account</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">Switch to the customer view to book services.</p>
                                </div>
                            </div>
                            <a
                                href="/login"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-900 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                            >
                                Open Customer Portal
                                <UserCircle className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500 text-center italic">To update your professional details, please contact platform support.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderProfile;
