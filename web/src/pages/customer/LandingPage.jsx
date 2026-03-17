import { Link } from 'react-router-dom';
import { ShieldCheck, Star, Clock, CheckCircle2, ChevronRight, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight, Play, Wrench, Zap } from 'lucide-react';
import { useAuth } from '../../firebase/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';

const LandingPage = () => {
    const { userData } = useAuth();
    const [providerDetails, setProviderDetails] = useState(null);
    const [activeBooking, setActiveBooking] = useState(null);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const serviceImages = [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop", // Plumbing
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop", // Electrical
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop", // Cleaning
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop", // Carpentry
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2070&auto=format&fit=crop"  // Salon
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % serviceImages.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // 1. Listen to Top Rated Active/Online Provider
        const topProviderQuery = query(
            collection(db, 'providers'),
            where('status', '==', 'active'),
            orderBy('rating', 'desc'),
            limit(10) // Get top 10 to filter online manually for better robustness
        );

        const unsubscribeTop = onSnapshot(topProviderQuery, (snapshot) => {
            const providers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Deduplicate by name if multiple exist
            const uniqueProvidersMap = new Map();
            providers.forEach(p => {
                const nameKey = (p.name || '').toLowerCase().trim();
                const existing = uniqueProvidersMap.get(nameKey);
                const pRating = parseFloat(p.rating) || 0;
                const eRating = existing ? (parseFloat(existing.rating) || 0) : 0;
                
                if (!existing || pRating > eRating) {
                    uniqueProvidersMap.set(nameKey, p);
                }
            });

            const uniqueProviders = Array.from(uniqueProvidersMap.values());
            // Filter online manually to handle type mismatches (string "true" vs boolean)
            const topOnline = uniqueProviders.find(p => p.isOnline === true || String(p.isOnline) === 'true');
            if (topOnline) setProviderDetails(topOnline);
        });

        // 2. Listen to User's Active Booking for Tracking (if logged in)
        let unsubscribeBooking = () => { };
        if (userData?.phone) {
            const bookingQuery = query(
                collection(db, 'bookings'),
                where('customerPhone', '==', userData.phone),
                where('status', 'in', ['pending', 'accepted', 'enroute', 'arrived', 'inprogress', 'negotiating']),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            unsubscribeBooking = onSnapshot(bookingQuery, (snapshot) => {
                if (!snapshot.empty) {
                    setActiveBooking({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                } else {
                    setActiveBooking(null);
                }
            });
        }

        return () => {
            unsubscribeTop();
            unsubscribeBooking();
        };
    }, [userData]);
    return (
        <div className="flex flex-col min-h-screen bg-surface-50">
            {/* Hero Section */}
            <section className="relative mesh-gradient text-white pt-32 pb-24 px-4 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-light/30 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse"></div>
                    <div className="absolute top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left space-y-8 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
                            <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                            <span className="text-sm font-semibold text-white/90 tracking-wide uppercase">Ahmedabad's #1 Service Platform</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                            <img src="/logo-v2.png" alt="PrimeSewa" className="h-16 md:h-20 object-contain mb-8 animate-float drop-shadow-2xl" />
                            Your Home Services, <br />
                            <span className="text-white">Reimagined.</span>
                        </h1>
                        <p className="text-xl text-white/80 max-w-lg font-medium leading-relaxed">
                            Book verified plumbers, electricians, and cleaners in minutes. Get transparent pricing and professional quality, guaranteed.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/dashboard" className="hover-lift inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-dark rounded-full font-bold text-lg shadow-2xl">
                                Book a Service <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/provider/login?signup=true" className="hover-lift inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full font-bold text-lg text-white border border-white/20">
                                Become a Partner
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-8 border-t border-white/10 text-white/70 text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-secondary" /> Vetted Pros
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-accent" /> Instant Assignment
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary-light" /> 100% Secure
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block relative animate-fade-in group">
                        <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] rotate-3 blur-3xl group-hover:rotate-6 transition-transform duration-700"></div>
                        <div className="relative glass-card-dark rounded-[2rem] shadow-2xl overflow-hidden aspect-[4/3] border border-white/20">
                            {serviceImages.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt="Professional Handyman"
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-60' : 'opacity-0'}`}
                                />
                            ))}
                            <div className="absolute top-6 right-6 flex gap-2 z-20">
                                {serviceImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-white w-8' : 'bg-white/30 hover:bg-white/50'}`}
                                    />
                                ))}
                            </div>
                            <div className="absolute bottom-6 right-6 left-auto w-auto min-w-[320px] max-w-[400px] glass-card border-white/20 p-6 rounded-2xl z-20 shadow-2xl animate-fade-in group/card">
                                {activeBooking ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg animate-pulse">
                                                    <Clock className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-surface-900 text-lg">Live Status: {activeBooking.status}</h4>
                                                    <p className="text-primary font-semibold text-sm">{activeBooking.service}</p>
                                                </div>
                                            </div>
                                            <Link to="/dashboard" className="bg-surface-100 hover:bg-primary hover:text-white p-3 rounded-xl transition-all shadow-sm">
                                                <ArrowRight className="w-5 h-5" />
                                            </Link>
                                        </div>
                                        <div className="h-3 w-full bg-surface-100 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full bg-linear-to-r from-primary to-primary-light transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)] ${activeBooking.trackingStatus === 'inprogress' ? 'w-full' :
                                                    activeBooking.trackingStatus === 'arrived' ? 'w-[75%]' :
                                                        activeBooking.trackingStatus === 'enroute' ? 'w-[50%]' :
                                                            activeBooking.status === 'accepted' ? 'w-[25%]' : 'w-[10%]'
                                                    }`}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-center mt-2.5 font-black tracking-[0.25em] uppercase text-primary/60">
                                            Service Tracking
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-3.5">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-primary text-white shadow-lg group-hover/card:scale-105 transition-transform duration-500">
                                                    {(providerDetails?.name || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-surface-900 text-base leading-tight">{providerDetails?.name || 'Finding Partner...'}</h4>
                                                    <p className="text-primary font-bold text-xs mt-0.5">{providerDetails?.category || 'Expert Service'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                <span className="font-black text-amber-600 text-xs">{(providerDetails && providerDetails.rating > 0) ? Number(providerDetails.rating).toFixed(1) : 'New'}</span>
                                            </div>
                                        </div>
                                        <div className="h-3 w-full bg-surface-100 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-linear-to-r from-primary to-primary-light w-full animate-pulse transition-all duration-700"></div>
                                        </div>
                                        <p className="text-[9px] text-center mt-2.5 font-black tracking-[0.3em] uppercase text-primary/50">
                                            Verified Partner
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Service Categories */}
            <section className="py-24 px-4 bg-white relative overflow-hidden">
                <div className="absolute -left-24 top-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                        <div className="max-w-2xl">
                            <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">Our Services</span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-surface-900 tracking-tight leading-tight">Professional care at <br /> your doorstep</h2>
                            <p className="mt-6 text-surface-800/60 text-lg font-medium leading-relaxed">Choose from our wide range of professional home services expertly handled by verified specialists.</p>
                        </div>
                        <Link to="/dashboard" className="group text-primary font-bold flex items-center gap-2 hover:gap-4 transition-all bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                            View all services <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { name: 'Plumbing', icon: '🚰', color: 'bg-primary/5', hover: 'hover:bg-primary/10' },
                            { name: 'Electrical', icon: '⚡', color: 'bg-accent/5', hover: 'hover:bg-accent/10' },
                            { name: 'Cleaning', icon: '🧹', color: 'bg-secondary/5', hover: 'hover:bg-secondary/10' },
                            { name: 'Carpentry', icon: '🔨', color: 'bg-rose-50', hover: 'hover:bg-rose-100' }
                        ].map((service, i) => (
                            <Link key={i} to="/dashboard" className={`group p-10 rounded-[2.5rem] border border-surface-100 bg-surface-50/50 ${service.hover} hover-lift transition-all duration-500 text-center`}>
                                <div className={`w-20 h-20 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                                    <span className="text-4xl">{service.icon}</span>
                                </div>
                                <h4 className="font-extrabold text-surface-900 text-lg group-hover:text-primary transition-colors">{service.name}</h4>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Layer */}
            <section className="py-32 px-4 bg-surface-50 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 max-w-2xl mx-auto animate-fade-in">
                        <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">Trust PrimeSewa</span>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-surface-900 tracking-tight">Why Choose Us?</h2>
                        <p className="mt-6 text-surface-800/60 text-lg font-medium leading-relaxed">We've built a platform that puts quality, safety, and your satisfaction at the heart of everything we do.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Feature 1 */}
                        <div className="glass-card hover-lift group p-12 rounded-[2.5rem] border-white/60 transition-all duration-500">
                            <div className="w-20 h-20 bg-primary/10 group-hover:bg-primary rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 shadow-xl shadow-primary/5">
                                <ShieldCheck className="w-10 h-10 text-primary group-hover:text-white transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-surface-900 mb-5 group-hover:text-primary transition-colors">Vetted & Verified</h3>
                            <p className="text-surface-800/60 leading-relaxed font-medium">Every partner undergoes a rigorous 3-step verification process including background checks and hands-on skill assessments.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass-card hover-lift group p-12 rounded-[2.5rem] border-white/60 transition-all duration-500">
                            <div className="w-20 h-20 bg-secondary/10 group-hover:bg-secondary rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 shadow-xl shadow-secondary/5">
                                <Clock className="w-10 h-10 text-secondary group-hover:text-white transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-surface-900 mb-5 group-hover:text-secondary transition-colors">Instant Assistance</h3>
                            <p className="text-surface-800/60 leading-relaxed font-medium">Forget long wait times. Our smart instant-match algorithm ensures a top-rated professional is on their way within minutes.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass-card hover-lift group p-12 rounded-[2.5rem] border-white/60 transition-all duration-500">
                            <div className="w-20 h-20 bg-accent/10 group-hover:bg-accent rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 shadow-xl shadow-accent/5">
                                <Star className="w-10 h-10 text-accent group-hover:text-white transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-surface-900 mb-5 group-hover:text-accent transition-colors">Premium Quality</h3>
                            <p className="text-surface-800/60 leading-relaxed font-medium">Transparent upfront pricing and a rock-solid satisfaction guarantee. You only pay for results that meet our high standards.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-32 px-4 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-12 animate-fade-in">
                            <div>
                                <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">Process</span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-surface-900 tracking-tight leading-tight">Elevated service in <br /> 3 simple steps</h2>
                            </div>

                            <div className="space-y-10">
                                {[
                                    { step: '01', title: 'Choose your service', desc: 'Browse our curated catalog and select the professional help you need.' },
                                    { step: '02', title: 'Set Date & Time', desc: 'Flexible scheduling that adapts to your life. Book for now or for later.' },
                                    { step: '03', title: 'Relax & Enjoy', desc: 'Our pro arrives on time with everything needed to get the job done right.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-8 group">
                                        <div className="w-16 h-16 rounded-3xl bg-surface-900 text-white flex items-center justify-center shrink-0 font-black text-2xl group-hover:bg-primary transition-all duration-500 shadow-xl shadow-surface-900/10">
                                            {item.step}
                                        </div>
                                        <div className="pt-2">
                                            <h4 className="text-2xl font-bold text-surface-900 mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
                                            <p className="text-surface-800/60 text-lg font-medium leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative animate-fade-in">
                            <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-3xl -rotate-6"></div>
                            <div className="bg-surface-900 p-12 rounded-[3rem] shadow-2xl space-y-8 max-w-md mx-auto relative border border-white/10">
                                <div className="flex items-center gap-5 border-b border-white/10 pb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-primary text-xs font-black uppercase tracking-[0.25em] mb-1">Confirmation</p>
                                        <p className="text-white text-xl font-bold">Booking Secured</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Service</span>
                                        <span className="text-white font-bold">Smart Lighting Fix</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Arrival</span>
                                        <span className="text-white font-bold">Today, 02:30 PM</span>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex -space-x-3">
                                        <div className="w-12 h-12 rounded-2xl border-2 border-surface-900 bg-linear-to-tr from-primary to-primary-light shadow-lg"></div>
                                        <div className="w-12 h-12 rounded-2xl border-2 border-surface-900 bg-linear-to-tr from-secondary to-emerald-300 shadow-lg"></div>
                                        <div className="w-12 h-12 rounded-2xl border-2 border-surface-900 bg-surface-800 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">15+</div>
                                    </div>
                                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Experts Available</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 px-4 bg-surface-900 text-white relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-16 border-b border-white/10 pb-20">
                        <div className="col-span-1 md:col-span-1 space-y-10">
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="w-12 h-12 bg-white rounded-2xl p-2.5 shadow-xl shadow-white/5 group-hover:scale-110 transition-transform duration-500">
                                    <img src="/logo-v2.png" alt="PrimeSewa" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-3xl font-black bg-clip-text text-transparent bg-linear-to-r from-white to-white/70 tracking-tighter">PrimeSewa</span>
                            </Link>
                            <p className="text-white/50 leading-relaxed font-medium text-lg">The most trusted and technologically advanced home service marketplace in Ahmedabad.</p>
                            <div className="flex gap-5">
                                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300 text-white/40">
                                        <Icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-black text-white mb-10 uppercase tracking-[0.2em] text-[11px] opacity-40">For Customers</h4>
                            <ul className="space-y-6 text-white/50 text-sm font-bold">
                                <li><Link to="/dashboard" className="hover:text-white transition-colors">Book a Service</Link></li>
                                <li><Link to="/dashboard" className="hover:text-white transition-colors">Coverage Areas</Link></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Customer Portal</Link></li>
                                <li><Link to="/legal" className="hover:text-white transition-colors">Safety Protocols</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-white mb-10 uppercase tracking-[0.2em] text-[11px] opacity-40">For Partners</h4>
                            <ul className="space-y-6 text-white/50 text-sm font-bold">
                                <li><Link to="/provider/login?signup=true" className="text-primary-light hover:text-white transition-colors">Become a Partner</Link></li>
                                <li><Link to="/provider/login" className="hover:text-white transition-colors">Partner Dashboard</Link></li>
                                <li><Link to="/provider/login" className="hover:text-white transition-colors">Growth Resources</Link></li>
                                <li><Link to="/provider/login" className="hover:text-white transition-colors">Partner Support</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-white mb-10 uppercase tracking-[0.2em] text-[11px] opacity-40">Contact Support</h4>
                            <ul className="space-y-8 text-white/50 text-sm font-bold">
                                <li className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-primary" />
                                    <span>hello@primesewa.com</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-primary" />
                                    <span>+91 90000 00000</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                                    <span className="leading-relaxed">Bodakdev, HQ Complex <br /> Ahmedabad, GJ 380054</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
                        <p>© 2026 PrimeSewa Technologies. Built for Excellence.</p>
                        <div className="flex gap-12">
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
