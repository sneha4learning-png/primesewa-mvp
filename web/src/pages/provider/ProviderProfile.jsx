import { useState, useEffect } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { getProviders } from '../../utils/mockDb';
import { UserCircle, Star, Briefcase, Phone, Tag, MapPin } from 'lucide-react';

const ProviderProfile = () => {
    const { currentUser, userData, handleLogout } = useAuth();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const providerName = userData?.name || currentUser?.displayName;
        if (!providerName) return;

        const loadDb = () => {
            const providers = getProviders();
            const me = providers.find(p => p.name === providerName);
            if (me) {
                setProfile(me);
            }
        };

        loadDb();
    }, [currentUser, userData]);

    if (!profile) return <div className="p-8 text-center">Loading Profile...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <UserCircle className="w-6 h-6 text-indigo-600" /> Account Profile
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-900 px-8 py-10 text-center flex flex-col items-center relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-lg border-4 border-indigo-200">
                        {profile.name.charAt(0)}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-white tracking-wide">{profile.name}</h2>
                    <p className="text-indigo-200 flex items-center gap-1 mt-1 font-medium">
                        <Tag className="w-4 h-4" /> {profile.category} Service Partner
                    </p>
                    <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border
                            ${profile.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                profile.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                    'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                            {profile.status}
                        </span>
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
                                        <p className="font-bold text-gray-900">{profile.jobs || 0} Jobs</p>
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
                                                profile.serviceAreas.map((area, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200">{area}</span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-sm">Not Specifed</span>
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
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900">{profile.rating} / 5.0</p>
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(profile.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500 text-center">To update these details, please contact platform support.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderProfile;
