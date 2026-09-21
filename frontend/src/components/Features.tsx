import { FileSearch, HelpCircle, GitCompare, AlertTriangle, Wand2, Compass, HelpCircle as QuestionIcon, Sparkles } from 'lucide-react';

export function Features() {
  const featuresList = [
    {
      icon: FileSearch,
      title: 'Intelligent Resume Parsing',
      description: 'Extract and organize skills, education, projects, experience and certifications.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: HelpCircle,
      title: 'Explainable ATS Scoring',
      description: 'Understand your ATS score and exactly how it was calculated.',
      color: 'from-indigo-500 to-blue-600',
    },
    {
      icon: GitCompare,
      title: 'Semantic Resume–Job Matching',
      description: 'Compare your resume with job descriptions using semantic similarity.',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      icon: AlertTriangle,
      title: 'Skill Gap & Priority Analysis',
      description: 'Identify missing skills and understand which ones matter most.',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Wand2,
      title: 'AI Resume Optimizer',
      description: 'Improve weak bullet points, keywords and resume content.',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Compass,
      title: 'Role Suitability Prediction',
      description: 'Discover roles that align with your skills, projects and experience.',
      color: 'from-pink-500 to-rose-600',
    },
    {
      icon: QuestionIcon,
      title: 'Personalized Interview Generator',
      description: 'Generate interview questions based on your resume and target job.',
      color: 'from-blue-600 to-purple-600',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI CAPABILITIES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Powerful AI Features
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Everything you need to optimize your resume and stand out in modern hiring pipelines.
          </p>
        </div>

        {/* 7 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature, idx) => {
            const IconComp = feature.icon;
            // Span full width on 3-col layout for the 7th card if desired
            const isFullOnLg = idx === 6 ? 'lg:col-span-3 lg:max-w-xl lg:mx-auto' : '';
            return (
              <div
                key={idx}
                className={`bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col justify-between ${isFullOnLg}`}
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} text-white flex items-center justify-center mb-4 shadow-md`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
