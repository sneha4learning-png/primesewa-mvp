import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LegalPage = ({ type }) => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mt-20">
                <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <h1 className="text-4xl font-black text-slate-900 mb-6">
                    {type === 'privacy' ? 'Privacy Policy' : type === 'safety' ? 'Safety Protocols' : 'Terms of Service'}
                </h1>
                <div className="prose text-slate-600 font-medium">
                    <p className="mb-6 text-sm text-slate-400 font-bold uppercase tracking-wider">Last updated: {new Date().toLocaleDateString()}</p>
                    <p className="mb-4 text-lg">
                        This is a placeholder page for the PrimeSewa {type === 'privacy' ? 'Privacy Policy' : type === 'safety' ? 'Safety Protocols' : 'Terms of Service'}.
                    </p>
                    <p className="text-lg">
                        {type === 'safety' 
                            ? 'Our safety protocols ensure a secure and trusted environment for both customers and partners. We conduct rigorous identity verification and background checks for every professional joined to our platform.'
                            : 'The actual comprehensive document will be updated here prior to the official public launch.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
