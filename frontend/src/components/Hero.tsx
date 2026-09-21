import { ArrowRight, Sparkles, CheckCircle2, AlertCircle, FileText, BarChart3, Target } from 'lucide-react';

export function Hero() {
  return (
    <section id="analyze" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Background Decorative Blur Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-300/30 to-purple-300/30 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Action CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Small Label Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI-POWERED RESUME INTELLIGENCE</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Build a Resume That{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gets Noticed
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              ResuCraft AI analyzes your resume, matches it with job requirements, identifies skill gaps, and provides personalized recommendations to help you become job-ready.
            </p>

            {/* Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                href="#example-analysis"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200"
              >
                Analyze My Resume
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-base shadow-xs hover:bg-slate-50 transition-all duration-200"
              >
                See How It Works
              </a>
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Explainable ATS Scoring
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Skill Gap Insights
              </span>
            </div>
          </div>

          {/* Right Column: Hero Mockup Dashboard */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Card Container */}
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 p-6 space-y-5">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Analysis Preview</h3>
                      <p className="text-xs text-slate-500">Senior Software Engineer</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Demo Data
                  </span>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* ATS Score Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>ATS Score</span>
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      84<span className="text-sm font-medium text-slate-500">/100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>

                  {/* Job Match Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Job Match</span>
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      87<span className="text-sm font-medium text-slate-500">%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '87%' }} />
                    </div>
                  </div>
                </div>

                {/* Skills Matched vs Missing */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Skills Matched: 18/22
                    </span>
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Missing: 4
                    </span>
                  </div>

                  {/* Mock Pills */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">React</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">TypeScript</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">Python</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">SQL</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-medium">REST API</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-medium">Docker</span>
                  </div>
                </div>

                {/* Demo Disclaimer */}
                <p className="text-[11px] text-center text-slate-400 italic">
                  * Live interactive analysis demo preview.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
