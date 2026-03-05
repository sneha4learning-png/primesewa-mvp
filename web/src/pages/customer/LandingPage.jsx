import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { getBookings, getProviders } from '../../utils/mockDb';
import { useState, useEffect } from 'react';

const LandingPage = () => {
    const { userData } = useAuth();
    const [activeBooking, setActiveBooking] = useState(null);
    const [providerDetails, setProviderDetails] = useState(null);

    useEffect(() => {
        if (!userData) return;

        const checkActive = () => {
            const myName = userData?.uid === 'mock-cust' ? 'Guest User' : (userData?.name || 'Customer');
            const allBookings = getBookings();

            // Find active booking for user (accepted or pending)
            const active = allBookings.find(b => b.customer === myName && (b.status === 'accepted' || b.status === 'pending' || b.status === 'negotiating'));

            if (active) {
                setActiveBooking(active);
                // Try to get provider details for rating
                const allProviders = getProviders();
                const matchedProvider = allProviders.find(p => p.name === active.provider);
                if (matchedProvider) {
                    setProviderDetails(matchedProvider);
                }
            } else {
                setActiveBooking(null);
                setProviderDetails(null);
            }
        };

        checkActive();
        const interval = setInterval(checkActive, 3000);
        return () => clearInterval(interval);
    }, [userData]);
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-[#0B0F19] text-white pt-32 pb-24 px-4 overflow-hidden">
                {/* Abstract gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
                    <div className="absolute top-32 -left-32 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            <span className="text-sm font-medium text-indigo-300 tracking-wide">Ahmedabad's #1 Service Platform</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                            Your Home Services, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                Reimagined.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-lg font-light leading-relaxed">
                            Book verified plumbers, electricians, and cleaners in minutes. Get transparent pricing and professional quality, guaranteed.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/customer/app" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                Book a Service <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/provider" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full font-bold text-lg text-white border border-white/10 transition-all">
                                Become a Partner
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-8 border-t border-white/10 text-slate-400 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Vetted Pros
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" /> Instant Assignment
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-400" /> 100% Secure
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl rotate-3 opacity-30 blur-2xl"></div>
                        <div className="relative bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden aspect-[4/3]">
                            <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop" alt="Professional Handyman" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                            <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${activeBooking ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'} shadow-md`}>
                                            {activeBooking ? activeBooking.provider.charAt(0) : 'A'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{activeBooking ? activeBooking.provider : 'Amit Patel'}</h4>
                                            <p className="text-indigo-200 text-sm">{activeBooking ? activeBooking.service : 'Expert Electrician'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-5 h-5 fill-current" />
                                        <span className="font-bold text-white">{providerDetails ? providerDetails.rating : '4.9'}</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className={`w-full h-full bg-gradient-to-r ${activeBooking?.status === 'accepted' ? 'from-emerald-400 to-emerald-500 animate-pulse' : 'from-blue-400 to-blue-500'}`}></div>
                                </div>
                                <p className={`text-xs text-center mt-2 font-medium tracking-wide uppercase ${activeBooking?.status === 'accepted' ? 'text-emerald-400' : 'text-blue-300'}`}>
                                    {activeBooking ? (activeBooking.status === 'accepted' ? 'On the way to job' : 'Finding Provider...') : 'Top Rated Partner'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Layer */}
            <section className="py-24 px-4 bg-slate-50 relative z-20 -mt-10 rounded-t-[3rem]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-slate-900">Why choose PrimeSewa?</h2>
                        <p className="mt-4 text-slate-600 text-lg">Experience the easiest way to book trusted professionals for your home.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                                <ShieldCheck className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Verified Partners</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Every provider undergoes strict background checks and skill verification before they can accept a single job on our platform.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-emerald-50 group-hover:bg-emerald-500 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                                <Clock className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Instant Booking</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Stop waiting days for a callback. Book in 3 clicks and our active providers start confirming your request within minutes.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-amber-50 group-hover:bg-amber-500 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                                <Star className="w-8 h-8 text-amber-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Quality Assured</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Your satisfaction is our metric. Providers must maintain high ratings, and you only pay upon job completion.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
