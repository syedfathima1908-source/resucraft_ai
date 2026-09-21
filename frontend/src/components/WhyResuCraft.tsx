import { FileText, Cpu, BarChart3, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export function WhyResuCraft() {
  return (
    <section id="why-resucraft" className="py-20 md:py-28 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>THE RESUCRAFT ADVANTAGE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Your Resume Should Do More Than List Your Skills.
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Many resumes are written for people but screened by automated systems. ResuCraft AI helps candidates understand how their resume performs against real job requirements and shows exactly what they can improve.
          </p>
        </div>

        {/* Visual Flow Diagram Container */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-lg shadow-slate-200/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-8">
            The Transformation Flow
          </h3>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
            
            {/* Step 1: Resume */}
            <div className="w-full lg:w-1/5 flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Raw Resume</h4>
              <p className="text-xs text-slate-500 mt-1">PDF / DOCX Format</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 lg:rotate-0 flex-shrink-0" />

            {/* Step 2: AI Analysis */}
            <div className="w-full lg:w-1/5 flex flex-col items-center text-center p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">AI Analysis</h4>
              <p className="text-xs text-indigo-700 font-medium mt-1">ResuCraft Engine</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 lg:rotate-0 flex-shrink-0" />

            {/* Step 3: Detailed Insights */}
            <div className="w-full lg:w-2/5 p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4" /> Comprehensive Intelligence Output
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium">
                  📊 ATS Score
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium">
                  🎯 Job Match %
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium">
                  🔍 Skill Gaps
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium">
                  💡 AI Recommendations
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 lg:rotate-0 flex-shrink-0" />

            {/* Step 4: Job Ready */}
            <div className="w-full lg:w-1/5 flex flex-col items-center text-center p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Job Ready</h4>
              <p className="text-xs text-emerald-700 font-semibold mt-1">Interview Primed</p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
