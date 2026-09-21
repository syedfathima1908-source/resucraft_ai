import { Cpu, ShieldCheck, Target, MessageSquare } from 'lucide-react';

export function ValueHighlights() {
  const highlights = [
    {
      icon: Cpu,
      title: 'Intelligent Analysis',
      description: 'Deep AI inspection of skills, experience, and resume formatting structure.',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      icon: ShieldCheck,
      title: 'ATS Optimization',
      description: 'Transparent scoring showing how applicant tracking systems parse your CV.',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Target,
      title: 'Job Matching',
      description: 'Semantic matching between your profile and target job descriptions.',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: MessageSquare,
      title: 'Interview Preparation',
      description: 'Custom interview questions tailored to your exact experience and skill gaps.',
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={index}
                className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-start gap-3"
              >
                <div className={`p-3 rounded-xl border ${item.color}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
