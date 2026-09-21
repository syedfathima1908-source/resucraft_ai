import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <a href="#" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Resu<span className="text-blue-500">Craft</span> AI
              </span>
            </a>
            <p className="text-slate-300 font-semibold text-sm">
              Analyze. Optimize. Get Hired.
            </p>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              AI-powered resume intelligence helping candidates calculate explainable ATS scores, match job descriptions, and prepare for top interviews.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5 font-medium">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#why-resucraft" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Account</h4>
              <ul className="space-y-2.5 font-medium">
                <li><a href="#analyze" className="hover:text-white transition-colors">Login</a></li>
                <li><a href="#analyze" className="hover:text-white transition-colors">Get Started</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ResuCraft AI. All rights reserved.</p>
          <p>Built for career intelligence & ATS optimization.</p>
        </div>

      </div>
    </footer>
  );
}
