import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const LandingPage = () => {
    const { userData } = useAuth();
    const [activeBooking, setActiveBooking] = useState(null);
    const [providerDetails, setProviderDetails] = useState(null);

    useEffect(() => {
        const fetchHeroData = async () => {
            try {
                // 1. Fetch Top Rated Provider as default
                const topProviderQuery = query(
                    collection(db, 'providers'),
                    where('status', '==', 'active'),
                    orderBy('rating', 'desc'),
                    limit(1)
                );
                const topSnap = await getDocs(topProviderQuery);
                if (!topSnap.empty) {
                    const topProvider = topSnap.docs[0].data();
                    setProviderDetails(topProvider);
                }

                // 2. Fetch Active Booking if user is logged in
                if (userData?.uid || userData?.name) {
                    const identifier = userData.name || userData.displayName;
                    const bookingsQuery = query(
                        collection(db, 'bookings'),
                        where('customer', '==', identifier),
                        where('status', 'in', ['accepted', 'pending', 'negotiating', 'arrived', 'started'])
                    );
                    const bSnap = await getDocs(bookingsQuery);
                    if (!bSnap.empty) {
                        const active = { id: bSnap.docs[0].id, ...bSnap.docs[0].data() };
                        setActiveBooking(active);

                        // If we have an active booking, fetch THAT provider's details specifically
                        if (active.provider) {
                            const pQuery = query(collection(db, 'providers'), where('name', '==', active.provider));
                            const pSnap = await getDocs(pQuery);
                            if (!pSnap.empty) {
                                setProviderDetails(pSnap.docs[0].data());
                            }
                        }
                    } else {
                        setActiveBooking(null);
                    }
                }
            } catch (err) {
                console.error("Error fetching hero data:", err);
            }
        };

        fetchHeroData();
        const interval = setInterval(fetchHeroData, 10000); // Check every 10s for updates
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
                            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                Book a Service <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/provider/login?signup=true" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full font-bold text-lg text-white border border-white/10 transition-all">
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
                            <img src={providerDetails?.previousWorkSample || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop"} alt="Professional Handyman" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                            <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${activeBooking ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'} shadow-md`}>
                                            {(activeBooking?.provider || providerDetails?.name || 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{activeBooking?.provider || providerDetails?.name || 'Finding Partner...'}</h4>
                                            <p className="text-indigo-200 text-sm">{activeBooking?.service || providerDetails?.category || 'Expert Service'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-5 h-5 fill-current" />
                                        <span className="font-bold text-white">{providerDetails?.rating || '5.0'}</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className={`w-full h-full bg-gradient-to-r ${activeBooking?.status === 'accepted' || activeBooking?.status === 'arrived' || activeBooking?.status === 'started' ? 'from-emerald-400 to-emerald-500 animate-pulse' : 'from-blue-400 to-blue-500'}`}></div>
                                </div>
                                <p className={`text-[10px] text-center mt-2 font-bold tracking-widest uppercase ${activeBooking?.status === 'accepted' || activeBooking?.status === 'arrived' || activeBooking?.status === 'started' ? 'text-emerald-400' : 'text-blue-300'}`}>
                                    {activeBooking ? (activeBooking.status === 'accepted' ? 'Partner is on the way' : activeBooking.status === 'arrived' ? 'Partner has arrived' : activeBooking.status === 'started' ? 'Job in progress' : 'Finding Provider...') : 'Top Rated Partner'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Service Categories */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Services at your doorstep</h2>
                            <p className="mt-4 text-slate-600 text-lg">Choose from our wide range of professional home services in Ahmedabad.</p>
                        </div>
                        <Link to="/dashboard" className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                            View all services <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: 'Plumbing', icon: '🚰', bg: 'bg-blue-50', color: 'text-blue-600' },
                            { name: 'Electrical', icon: '⚡', bg: 'bg-amber-50', color: 'text-amber-600' },
                            { name: 'Cleaning', icon: '🧹', bg: 'bg-emerald-50', color: 'text-emerald-600' },
                            { name: 'Carpentry', icon: '🔨', bg: 'bg-rose-50', color: 'text-rose-600' }
                        ].map((service, i) => (
                            <Link key={i} to="/dashboard" className="group p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300 text-center">
                                <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">{service.icon}</span>
                                <h4 className="font-bold text-slate-900">{service.name}</h4>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Layer */}
            <section className="py-24 px-4 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Why PrimeSewa?</h2>
                        <p className="mt-4 text-slate-600 text-lg">We've built a platform that puts quality and trust first.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300 shadow-sm">
                                <ShieldCheck className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Vetted & Verified</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Every partner undergoes a 3-step verification process including background checks and skill assessments.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-emerald-50 group-hover:bg-emerald-500 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300 shadow-sm">
                                <Clock className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Fastest Turnaround</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Forget waiting for calls. Our instant-match system ensures a professional is assigned within minutes.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                            <div className="w-16 h-16 bg-amber-50 group-hover:bg-amber-500 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300 shadow-sm">
                                <Star className="w-8 h-8 text-amber-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Quality First</h3>
                            <p className="text-slate-600 leading-relaxed font-light">Transparent pricing and a satisfaction guarantee. You only pay once the job is completed to your liking.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 px-4 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-50/30 -skew-x-12 translate-x-1/2"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">Book a professional <br /> in 3 simple steps</h2>

                            <div className="space-y-8 mt-12">
                                <div className="flex gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xl group-hover:scale-110 transition-transform">1</div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">Choose your service</h4>
                                        <p className="text-slate-500 mt-2">Select the service you need from our extensive range of home solutions.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xl group-hover:scale-110 transition-transform">2</div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">Set Date & Time</h4>
                                        <p className="text-slate-500 mt-2">Pick a schedule that works for you. We provide slots all through the week.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-xl group-hover:scale-110 transition-transform">3</div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">Sit back and relax</h4>
                                        <p className="text-slate-500 mt-2">Our verified professional will arrive punctually and get the job done right.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl space-y-6 max-w-sm mx-auto">
                                <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Confirmation</p>
                                        <p className="text-white font-bold">Booking Scheduled</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 italic">Service</span>
                                        <span className="text-white font-medium">Power Fixing</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 italic">Date</span>
                                        <span className="text-white font-medium">Tomorrow, 10:00 AM</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-500"></div>
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-500"></div>
                                    </div>
                                    <span className="text-xs text-slate-400">12+ active pros near you</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-4 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-16">
                        <div className="col-span-1 md:col-span-1 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold tracking-tight">PrimeSewa</span>
                            </div>
                            <p className="text-slate-400 leading-relaxed font-light">The most trusted home service platform in Ahmedabad. Quality services, guaranteed.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">For Customers</h4>
                            <ul className="space-y-4 text-slate-400 text-sm">
                                <li><Link to="/dashboard" className="hover:text-white transition-colors">Book a Service</Link></li>
                                <li><Link to="/dashboard" className="hover:text-white transition-colors">Service Areas</Link></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Customer Login</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">For Partners</h4>
                            <ul className="space-y-4 text-slate-400 text-sm">
                                <li><Link to="/provider/login?signup=true" className="hover:text-white transition-colors font-bold text-indigo-400">Join as a Partner</Link></li>
                                <li><Link to="/provider/login" className="hover:text-white transition-colors">Partner Portal</Link></li>
                                <li><Link to="/provider/login" className="hover:text-white transition-colors">Earnings Dashboard</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Contact</h4>
                            <ul className="space-y-4 text-slate-400 text-sm italic font-medium">
                                <li>support@primesewa.com</li>
                                <li>+91 90000 00000</li>
                                <li className="not-italic text-slate-500">Bodakdev, Ahmedabad</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
                        <p>© 2026 PrimeSewa Technologies. All rights reserved.</p>
                        <div className="flex gap-8">
                            <Link to="/" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
