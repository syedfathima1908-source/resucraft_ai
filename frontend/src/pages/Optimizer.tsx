import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { AnalysisHistoryRecord } from '../types/history';
import {
  generateOptimizerResults,
  extractMissingSkillsData,
  extractMatchedSkillsData,
  fetchGeminiOptimizerResults,
  type OptimizerResultsData,
} from '../lib/optimizerService';
import {
  Wand2,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Target,
  History,
  Zap,
} from 'lucide-react';

export const Optimizer: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIdFromUrl = searchParams.get('id') || searchParams.get('analysisId');

  // History records state
  const [historyRecords, setHistoryRecords] = useState<AnalysisHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Selected record state
  const [selectedRecord, setSelectedRecord] = useState<AnalysisHistoryRecord | null>(null);

  // Gemini AI full recommendation enhancement state
  const [isEnhancingWithGemini, setIsEnhancingWithGemini] = useState<boolean>(false);
  const [geminiEnhancedResults, setGeminiEnhancedResults] = useState<OptimizerResultsData | null>(null);

  // UI state for optimizer tab navigation
  const [activeOptimizerTab, setActiveOptimizerTab] = useState<string>('Critical Improvements');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch analysis history from Supabase
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      const records = (data as AnalysisHistoryRecord[]) || [];
      setHistoryRecords(records);

      if (records.length > 0) {
        if (selectedIdFromUrl) {
          const match = records.find((r) => r.id === selectedIdFromUrl);
          if (match) {
            setSelectedRecord(match);
          } else {
            setSelectedRecord(records[0]);
          }
        } else {
          setSelectedRecord(records[0]);
        }
      } else {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      console.error('Fetch history for optimizer error:', err);
      setHistoryError(err.message || 'Failed to load your analysis history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Handle URL change or selection change
  useEffect(() => {
    if (selectedIdFromUrl && historyRecords.length > 0) {
      const match = historyRecords.find((r) => r.id === selectedIdFromUrl);
      if (match && match.id !== selectedRecord?.id) {
        setSelectedRecord(match);
        setGeminiEnhancedResults(null);
      }
    }
  }, [selectedIdFromUrl, historyRecords]);

  const handleSelectRecord = (record: AnalysisHistoryRecord) => {
    setSelectedRecord(record);
    setGeminiEnhancedResults(null);
    setSearchParams({ id: record.id });
    setActiveOptimizerTab('Critical Improvements');
  };

  const handleEnhanceWithGemini = async () => {
    if (!selectedRecord) return;
    setIsEnhancingWithGemini(true);
    try {
      const missingSkillsData = extractMissingSkillsData(selectedRecord);
      const matchedSkills = extractMatchedSkillsData(selectedRecord);
      const res = await fetchGeminiOptimizerResults(
        selectedRecord.resume_filename || '',
        '',
        {
          matched_skills: matchedSkills,
          critical_missing_skills: missingSkillsData.critical,
          important_missing_skills: missingSkillsData.important,
          nice_to_have_missing_skills: missingSkillsData.nice_to_have,
          ats_score_breakdown: { total_score: Number(selectedRecord.match_percentage) || 0 },
        }
      );
      if (res) {
        setGeminiEnhancedResults(res);
      }
    } catch (err) {
      console.error('Gemini enhancement error:', err);
    } finally {
      setIsEnhancingWithGemini(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper formatting dates
  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Extract analysis data for selected record
  const missingSkillsData = selectedRecord ? extractMissingSkillsData(selectedRecord) : null;
  const matchedSkills = selectedRecord ? extractMatchedSkillsData(selectedRecord) : [];
  const optimizerResults: OptimizerResultsData | null = geminiEnhancedResults
    ? geminiEnhancedResults
    : selectedRecord
    ? generateOptimizerResults(selectedRecord)
    : null;


  return (
    <DashboardLayout title="AI Resume Optimizer">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/10">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>INTELLIGENT RESUME OPTIMIZER</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                AI Resume Optimizer
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                Transform your existing ATS analysis results into high-impact bullet points, keyword placements, and priority improvements to boost recruiter callbacks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedRecord && (
                <button
                  type="button"
                  onClick={handleEnhanceWithGemini}
                  disabled={isEnhancingWithGemini}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-400/40 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isEnhancingWithGemini ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enhancing with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-purple-300" />
                      <span>{geminiEnhancedResults ? 'Gemini AI Enhanced' : 'Enhance with Gemini AI'}</span>
                    </>
                  )}
                </button>
              )}

              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze New Resume</span>
              </Link>
            </div>
          </div>
        </div>

        {/* History Error Alert */}
        {historyError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-rose-950">Error Loading History</h4>
              <p className="text-xs text-rose-800">{historyError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingHistory && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-slate-100 rounded-2xl" />
              <div className="h-24 bg-slate-100 rounded-2xl" />
              <div className="h-24 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        )}

        {/* Empty State: User has no analysis records */}
        {!loadingHistory && historyRecords.length === 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center max-w-2xl mx-auto space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200/60 shadow-2xs">
              <Wand2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">No Resume Analyses Available</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                To generate AI optimizer recommendations, please run an ATS analysis first by uploading your resume against a target job description.
              </p>
            </div>

            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Go to Analyze Resume</span>
            </Link>
          </div>
        )}

        {/* Main Optimizer Dashboard Content */}
        {!loadingHistory && historyRecords.length > 0 && selectedRecord && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 1. Selection & Context Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Analysis History Selector</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Select Analysis to Optimize
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose from your saved resume ATS match reports to view tailored recommendations.
                  </p>
                </div>

                {/* Resume Selector Dropdown */}
                <div className="w-full md:w-80">
                  <label htmlFor="analysis-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Active Resume Analysis ({historyRecords.length})
                  </label>
                  <select
                    id="analysis-select"
                    value={selectedRecord.id}
                    onChange={(e) => {
                      const rec = historyRecords.find((r) => r.id === e.target.value);
                      if (rec) handleSelectRecord(rec);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                  >
                    {historyRecords.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.resume_filename} ({rec.match_percentage}% ATS Match - {formatDate(rec.created_at)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Analysis Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Score Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                    ATS Match Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {selectedRecord.match_percentage}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Overall</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Analyzed on {formatDate(selectedRecord.created_at)}</p>
                </div>

                {/* File Info */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Resume Document
                  </span>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-slate-900 truncate">{selectedRecord.resume_filename}</p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total Resume Skills:{' '}
                    <strong className="text-slate-700">
                      {typeof selectedRecord.resume_skills === 'object' && selectedRecord.resume_skills !== null && !Array.isArray(selectedRecord.resume_skills)
                        ? selectedRecord.resume_skills.total || 'N/A'
                        : 'N/A'}
                    </strong>
                  </p>
                </div>

                {/* Matched Skills */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                    Matched Skills
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-700">{matchedSkills.length}</span>
                    <span className="text-xs font-semibold text-emerald-600">Keywords</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {matchedSkills.slice(0, 3).join(', ')} {matchedSkills.length > 3 ? '...' : ''}
                  </p>
                </div>

                {/* Missing Skills */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 block">
                    Missing Skill Gaps
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-700">{missingSkillsData?.all.length || 0}</span>
                    <span className="text-xs font-semibold text-rose-600">Gaps</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Critical:{' '}
                    <strong className="text-rose-700">{missingSkillsData?.critical.length || 0}</strong> | Important:{' '}
                    <strong className="text-amber-700">{missingSkillsData?.important.length || 0}</strong>
                  </p>
                </div>
              </div>

              {/* Skill Gap Pills Bar */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" />
                  Target Job Skill Gap Breakdown
                </h4>

                <div className="flex flex-wrap gap-2">
                  {missingSkillsData?.critical.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-100 text-rose-900 text-xs font-semibold border border-rose-200"
                    >
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      Critical: {s}
                    </span>
                  ))}

                  {missingSkillsData?.important.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Important: {s}
                    </span>
                  ))}

                  {missingSkillsData?.nice_to_have.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-100 text-blue-900 text-xs font-semibold border border-blue-200"
                    >
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Nice to Have: {s}
                    </span>
                  ))}

                  {(!missingSkillsData || missingSkillsData.all.length === 0) && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All job description skills are matched!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Categorized Recommendations Card */}
            {optimizerResults && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                      <Zap className="w-3.5 h-3.5 text-purple-600" />
                      <span>OPTIMIZATION STRATEGIES</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                      Categorized AI Recommendations
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tailored strategies across 5 key dimensions to increase ATS indexability and recruiter engagement.
                    </p>
                  </div>
                </div>

                {/* Category Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
                  {optimizerResults.categories.map((cat) => {
                    const isActive = activeOptimizerTab === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setActiveOptimizerTab(cat.name)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {cat.recommendations.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Category Content */}
                {(() => {
                  const activeCat = optimizerResults.categories.find(
                    (c) => c.name === activeOptimizerTab
                  ) || optimizerResults.categories[0];

                  if (!activeCat) return null;

                  return (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <p className="text-xs text-slate-500 font-medium italic">{activeCat.description}</p>

                      <div className="grid grid-cols-1 gap-4">
                        {activeCat.recommendations.map((rec, idx) => {
                          const priorityColor =
                            rec.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : rec.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200';

                          return (
                            <div
                              key={idx}
                              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">{rec.category}</span>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${priorityColor}`}>
                                  {rec.priority} Priority
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                <strong className="text-slate-900 font-semibold">Diagnosis: </strong>
                                {rec.explanation}
                              </p>
                              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-indigo-950 font-semibold flex items-start gap-2">
                                <ArrowRight className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px] block">
                                    Action Step
                                  </span>
                                  <span>{rec.action}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Suggested Bullet Point Changes Sub-Section */}
                {optimizerResults.suggested_changes && optimizerResults.suggested_changes.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          Suggested High-Impact Bullet Point Upgrades
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Rewritten action statements derived from candidate resume skills without inventing facts or experience.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {optimizerResults.suggested_changes.map((change, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/90 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Original */}
                            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/60 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                                Standard Phrasing
                              </span>
                              <p className="text-xs text-slate-700 italic">"{change.original}"</p>
                            </div>

                            {/* Improved */}
                            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1 relative group">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                  Suggested High-Impact Bullet
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(change.improved, idx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer shadow-2xs"
                                >
                                  {copiedIndex === idx ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-emerald-600" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-slate-900 font-semibold leading-relaxed">
                                "{change.improved}"
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium">
                            💡 <strong className="text-slate-700">Reason: </strong> {change.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
