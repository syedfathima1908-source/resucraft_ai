import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import type { AnalysisHistoryRecord } from '../types/history';
import {
  FileText,
  BarChart3,
  Target,
  Sparkles,
  Plus,
  TrendingUp,
  Award,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Wand2,
  Bot,
  History,
  FileSearch,
  ExternalLink,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="mt-3 flex items-baseline justify-between">
      <span className="text-2xl sm:text-3xl font-black text-slate-900">{value}</span>
      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
        {change}
      </span>
    </div>
  </div>
);

// Helper to format dates relatively
const formatRelativeDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return dateStr;
  }
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<'last6' | 'all'>('last6');

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    const fetchUserDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchErr) {
          throw new Error(fetchErr.message);
        }

        setRecords((data as AnalysisHistoryRecord[]) || []);
      } catch (err: any) {
        console.error('Error fetching dashboard analysis history:', err);
        setError(err.message || 'Failed to load your analysis statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDashboardData();
  }, [user]);

  // Analytics Calculations
  const totalAnalyses = records.length;

  const avgATS =
    records.length > 0
      ? Math.round(records.reduce((acc, r) => acc + (r.match_percentage || 0), 0) / records.length)
      : 0;

  const avgJobMatch = avgATS; // Match percentage represents job match score

  const uniqueSkillsSet = new Set<string>();
  records.forEach((r) => {
    if (Array.isArray(r.matched_skills)) {
      r.matched_skills.forEach((s) => uniqueSkillsSet.add(s));
    }
  });
  const totalSkillsIdentified = uniqueSkillsSet.size;

  const stats = [
    {
      title: 'Resumes Analyzed',
      value: totalAnalyses,
      change: totalAnalyses === 0 ? '0 analyses' : totalAnalyses === 1 ? '1 analysis' : `${totalAnalyses} total`,
      icon: FileText,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Average ATS Score',
      value: totalAnalyses > 0 ? `${avgATS}/100` : 'N/A',
      change: totalAnalyses > 0 ? (avgATS >= 75 ? 'Strong Match' : avgATS >= 50 ? 'Moderate' : 'Needs Work') : 'No data',
      icon: BarChart3,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
    {
      title: 'Average Job Match',
      value: totalAnalyses > 0 ? `${avgJobMatch}%` : 'N/A',
      change: totalAnalyses > 0 ? 'Target match' : 'No target JD',
      icon: Target,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
    {
      title: 'Skills Identified',
      value: totalAnalyses > 0 ? totalSkillsIdentified : 0,
      change: totalAnalyses > 0 ? `${totalSkillsIdentified} matched` : 'No skills',
      icon: Award,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
  ];

  // Recent Analyses (latest 5)
  const recentAnalyses = records.slice(0, 5);

  // Chronological chart data (oldest to newest)
  const sortedChronological = [...records].reverse();
  const chartRecords = chartFilter === 'last6' ? sortedChronological.slice(-6) : sortedChronological;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* 1. HERO / WELCOME CARD */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-800">
          {/* Subtle ambient light effects */}
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-60 h-60 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>RESUCRAFT AI DASHBOARD</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Welcome back, {fullName} 👋
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Track your resume performance, identify skill gaps, optimize your resume, and prepare for interviews with AI-driven insights.
                </p>
              </div>

              <button
                onClick={() => navigate('/analyze')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all duration-200 flex-shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Analyze Your Resume →</span>
              </button>
            </div>

            {/* Visual Capability Indicators / Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
              {[
                { label: 'Analyze your resume', icon: FileSearch, path: '/analyze' },
                { label: 'Improve your ATS score', icon: Wand2, path: '/optimizer' },
                { label: 'Learn in-demand skills', icon: History, path: '/history' },
                { label: 'Get ready for interviews', icon: Bot, path: '/interview' },
              ].map((cap) => {
                const IconComp = cap.icon;
                return (
                  <button
                    key={cap.label}
                    onClick={() => navigate(cap.path)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition-all text-xs text-slate-200 font-semibold group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{cap.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading Spinner or Error Alert */}
        {loading && (
          <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-200/80 text-slate-500 text-xs font-bold gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading your authenticated dashboard analytics...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2. ANALYTICS CARDS GRID */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>
        )}

        {/* 3. ATS SCORE PROGRESS CHART & QUICK ACTIONS ROW */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ATS Score Progress Card (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>PERFORMANCE OVER TIME</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">ATS Score Progress</h3>
                  <p className="text-xs text-slate-500">Your historical resume ATS scores over time</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChartFilter('last6')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartFilter === 'last6'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Last 6 Analyses
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Analyses
                  </button>
                </div>
              </div>

              {/* Chart SVG Rendering */}
              {chartRecords.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                  <BarChart3 className="w-8 h-8 text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">No score history available yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Analyze a resume against a target job description to see your progress chart.
                  </p>
                  <button
                    onClick={() => navigate('/analyze')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Analyze Your Resume →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64 relative w-full pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Y Gridlines */}
                      {[0, 50, 100, 150].map((yVal, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={yVal}
                          x2="500"
                          y2={yVal}
                          stroke="#f1f5f9"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {/* Calculate SVG Points */}
                      {(() => {
                        const width = 500;
                        const height = 180;
                        const paddingX = 30;
                        const usableWidth = width - paddingX * 2;

                        const pts = chartRecords.map((r, idx) => {
                          const x =
                            chartRecords.length === 1
                              ? width / 2
                              : paddingX + (idx / (chartRecords.length - 1)) * usableWidth;
                          const score = Math.min(100, Math.max(0, r.match_percentage || 0));
                          const y = height - (score / 100) * (height - 30) + 15;
                          return { x, y, score, record: r };
                        });

                        const polylineStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
                        const areaStr = `${pts[0].x},${height} ` + polylineStr + ` ${pts[pts.length - 1].x},${height}`;

                        return (
                          <>
                            {/* Area Fill */}
                            <polygon points={areaStr} fill="url(#scoreGradient)" />

                            {/* Line */}
                            <polyline
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylineStr}
                            />

                            {/* Data Points */}
                            {pts.map((p, idx) => (
                              <g key={p.record.id || idx} className="group cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="6"
                                  className="fill-blue-600 stroke-white stroke-2 group-hover:r-8 transition-all shadow-md"
                                />
                                {/* Label above point */}
                                <text
                                  x={p.x}
                                  y={p.y - 12}
                                  textAnchor="middle"
                                  className="text-[10px] font-extrabold fill-slate-800"
                                >
                                  {p.score}%
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* X-axis date labels */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 pt-2 border-t border-slate-100">
                    {chartRecords.map((r, i) => (
                      <span key={r.id || i} className="truncate max-w-20 text-center">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Card (1 Col) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>ACTION CENTER</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Quick Actions</h3>
                <p className="text-xs text-slate-500">Jump directly into your next career preparation step</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Analyze Resume',
                    desc: 'Get ATS score & skill insights',
                    icon: FileSearch,
                    path: '/analyze',
                    bg: 'bg-blue-50 text-blue-600',
                  },
                  {
                    title: 'Optimize Resume',
                    desc: 'Improve your resume with AI',
                    icon: Wand2,
                    path: '/optimizer',
                    bg: 'bg-indigo-50 text-indigo-600',
                  },
                  {
                    title: 'AI Mock Interview',
                    desc: 'Practice and get AI feedback',
                    icon: Bot,
                    path: '/interview',
                    bg: 'bg-purple-50 text-purple-600',
                  },
                  {
                    title: 'View History',
                    desc: 'See all your past analyses',
                    icon: History,
                    path: '/history',
                    bg: 'bg-emerald-50 text-emerald-600',
                  },
                ].map((act) => {
                  const ActIcon = act.icon;
                  return (
                    <button
                      key={act.title}
                      onClick={() => navigate(act.path)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-200 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${act.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                          <ActIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {act.title}
                          </h4>
                          <p className="text-[11px] text-slate-500">{act.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. RECENT ANALYSES SECTION */}
        {!loading && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Recent Analyses</h3>
                <p className="text-xs text-slate-500">Your latest resume and job description comparisons</p>
              </div>
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>View All History</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentAnalyses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">No resume analyses yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Analyze your first resume to see your ATS performance, skill insights, and progress here.
                </p>
                <button
                  onClick={() => navigate('/analyze')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Analyze Your Resume →</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="pb-3 px-3">Resume Name</th>
                      <th className="pb-3 px-3 text-center">ATS Score</th>
                      <th className="pb-3 px-3 text-center">Job Match</th>
                      <th className="pb-3 px-3 text-center">Skills Found</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {recentAnalyses.map((item) => {
                      const matchedCount = Array.isArray(item.matched_skills) ? item.matched_skills.length : 0;
                      const score = Math.round(item.match_percentage || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-4 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="truncate max-w-xs">{item.resume_filename}</span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-block font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {score}%
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-block font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                              {score}%
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center text-emerald-700 font-bold">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {matchedCount} Skills
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-500 font-semibold whitespace-nowrap">
                            {formatRelativeDate(item.created_at)}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <button
                              onClick={() => navigate('/history')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

