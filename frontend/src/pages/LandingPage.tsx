import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ValueHighlights } from '../components/ValueHighlights';
import { WhyResuCraft } from '../components/WhyResuCraft';
import { HowItWorks } from '../components/HowItWorks';
import { Features } from '../components/Features';
import { ExampleAnalysis } from '../components/ExampleAnalysis';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <ValueHighlights />
        <WhyResuCraft />
        <HowItWorks />
        <Features />
        <ExampleAnalysis />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
