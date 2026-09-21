import { BarChart3, CheckCircle2, AlertCircle, Sparkles, Tag } from 'lucide-react';

export function ExampleAnalysis() {
  const scoreBreakdown = [
    { label: 'Skills Match', score: '22/25', percentage: 88 },
    { label: 'Keywords', score: '17/20', percentage: 85 },
    { label: 'Semantic Match', score: '18/20', percentage: 90 },
    { label: 'Structure', score: '9/10', percentage: 90 },
    { label: 'Experience', score: '9/10', percentage: 90 },
    { label: 'Formatting', score: '9/10', percentage: 90 },
  ];

  return (
    <section id="example-analysis" className="py-20 md:py-28 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>INTERACTIVE DEMO PREVIEW</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            See What ResuCraft AI Can Tell You
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Explore a sample analysis dashboard showing explainable metrics, matched skills, and prioritized gap recommendations.
          </p>
        </div>

        {/* Realistic Dashboard Analysis Card */}
        <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 space-y-8">
          
          {/* Top Banner Notice */}
          <div className="flex items-center justify-between bg-amber-100/70 border border-amber-200/90 text-amber-900 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-700" />
              Example Analysis
            </span>
            <span className="text-xs text-amber-800 font-normal hidden sm:inline">
              Target Role: Full-Stack Developer
            </span>
          </div>

          {/* Grid Layout: ATS Score & Job Match Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ATS Score Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">ATS SCORE</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                  STRONG MATCH
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900">84</span>
                <span className="text-lg text-slate-400 font-bold">/ 100</span>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Breakdown</h4>
                {scoreBreakdown.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-900 font-bold">{item.score}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job Match & Skills Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">JOB MATCH</h3>
                  <span className="text-xs font-semibold text-slate-500">Semantic Fit</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-indigo-600">87%</span>
                </div>
              </div>

              {/* Matched Skills */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matched Skills (5)
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Python', 'Java', 'SQL', 'React', 'Git'].map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Missing Skills (2)
                </div>
                <div className="flex flex-wrap gap-2">
                  {['REST API', 'Docker'].map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Skill Gap Priority Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>SKILL GAP & PRIORITY</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Critical */}
              <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-1">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical</div>
                <div className="text-base font-extrabold text-slate-900">REST API</div>
                <p className="text-[11px] text-rose-700 font-medium">Required for 90% target jobs</p>
              </div>

              {/* Important */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Important</div>
                <div className="text-base font-extrabold text-slate-900">Docker</div>
                <p className="text-[11px] text-amber-700 font-medium">Standard containerization requirement</p>
              </div>

              {/* Nice to Have */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-1">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Nice to Have</div>
                <div className="text-base font-extrabold text-slate-900">AWS</div>
                <p className="text-[11px] text-blue-700 font-medium">Cloud deployment bonus</p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
