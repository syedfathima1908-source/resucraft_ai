import { Upload, SearchCheck, Rocket, Sparkles } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      title: 'Upload Your Resume',
      description: 'Upload your resume in PDF or DOCX format.',
      badge: 'Quick & Secure',
    },
    {
      number: '02',
      icon: SearchCheck,
      title: 'Analyze & Match',
      description: 'Get ATS insights, job matching and skill-gap analysis.',
      badge: 'Instant Results',
    },
    {
      number: '03',
      icon: Rocket,
      title: 'Improve & Prepare',
      description: 'Use AI recommendations and personalized interview questions.',
      badge: 'Job-Ready',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>SIMPLE PROCESS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Get Job-Ready in 3 Simple Steps
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Follow our straightforward workflow to transform your resume into a high-scoring career asset.
          </p>
        </div>

        {/* 3 Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => {
            const IconComp = step.icon;
            return (
              <div
                key={index}
                className="relative bg-slate-50 border border-slate-200/80 rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-300 flex flex-col group"
              >
                {/* Step Number Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                    {step.number}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">
                    {step.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-200">
                  <IconComp className="w-6 h-6" />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
