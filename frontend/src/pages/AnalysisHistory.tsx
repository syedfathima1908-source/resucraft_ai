import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { AnalysisHistoryRecord } from '../types/history';
import {
  History,
  FileText,
  Trash2,
  Eye,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  Lightbulb,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AnalysisHistory: React.FC = () => {
  const { user } = useAuth();
  const [historyRecords, setHistoryRecords] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal view record detail state
  const [selectedRecord, setSelectedRecord] = useState<AnalysisHistoryRecord | null>(null);

  // Deletion confirmation modal state
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchHistory = async () => {
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

      setHistoryRecords((data as AnalysisHistoryRecord[]) || []);
    } catch (err: any) {
      console.error('Fetch history error:', err);
      setError(
        err.message ||
          'Failed to load analysis history. Please verify the database table exists in Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDeleteRecord = async () => {
    if (!deletingRecordId || !user) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error: delErr } = await supabase
        .from('analysis_history')
        .delete()
        .eq('id', deletingRecordId)
        .eq('user_id', user.id);

      if (delErr) {
        throw new Error(delErr.message);
      }

      // Remove deleted item from local state
      setHistoryRecords((prev) => prev.filter((r) => r.id !== deletingRecordId));
      setDeletingRecordId(null);
      if (selectedRecord?.id === deletingRecordId) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      console.error('Delete history error:', err);
      setDeleteError(err.message || 'Failed to delete record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getMissingSkillsData = (record: AnalysisHistoryRecord) => {
    if (Array.isArray(record.missing_skills)) {
      return {
        all: record.missing_skills,
        critical: record.missing_skills,
        important: [] as string[],
        nice_to_have: [] as string[],
        isCategorized: false,
      };
    }
    const ms = record.missing_skills || {};
    const all = ms.all || [];
    const critical = ms.critical || [];
    const important = ms.important || [];
    const nice_to_have = ms.nice_to_have || [];
    return {
      all,
      critical,
      important,
      nice_to_have,
      isCategorized: critical.length > 0 || important.length > 0 || nice_to_have.length > 0,
    };
  };
  const getRecommendationsData = (record: AnalysisHistoryRecord): { list: string[]; optimizer: any } => {
    if (Array.isArray(record.recommendations)) {
      return {
        list: record.recommendations,
        optimizer: null,
      };
    }
    const recObj = (record.recommendations as any) || {};
    return {
      list: (recObj.list as string[]) || [],
      optimizer: recObj.optimizer || null,
    };
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <DashboardLayout title="Analysis History">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/10">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>USER RESUME LOGS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Resume Analysis History
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Review past ATS match reports, track skill coverage over time, and inspect recommendations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchHistory}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>New Analysis</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Error Loading History</h4>
                <p className="text-xs text-rose-800 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded-full w-20" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-10 bg-slate-100 rounded-xl" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && historyRecords.length === 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center max-w-2xl mx-auto space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200/60 shadow-2xs">
              <History className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">No Resume Analyses Yet</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                You haven't run any ATS resume match scans yet. Upload your resume and compare it against any target job posting to save history logs.
              </p>
            </div>

            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Your First Analysis</span>
            </Link>
          </div>
        )}

        {/* Records List */}
        {!loading && !error && historyRecords.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Saved Reports ({historyRecords.length})
              </span>
              <span className="text-xs text-slate-400">Showing newest first</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {historyRecords.map((record) => {
                const matchedCount = Array.isArray(record.matched_skills)
                  ? record.matched_skills.length
                  : 0;
                const missingData = getMissingSkillsData(record);
                const missingCount = missingData.all.length;

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900 truncate max-w-sm">
                            {record.resume_filename}
                          </h4>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getScoreBadgeClass(
                              Number(record.match_percentage)
                            )}`}
                          >
                            {record.match_percentage}% ATS Match
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(record.created_at)}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {matchedCount} Matched Skills
                          </span>
                          <span className="flex items-center gap-1 text-rose-700 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            {missingCount} Missing Skills
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        to={`/optimizer?id=${record.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-100 transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Optimize</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRecordId(record.id)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 border border-slate-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Saved Analysis Details</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedRecord.resume_filename}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scanned on {formatDate(selectedRecord.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Breakdown Summary */}
              {(() => {
                const missingData = getMissingSkillsData(selectedRecord);
                return (
                  <>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Overall ATS Match
                        </span>
                        <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {selectedRecord.match_percentage}%
                        </span>
                      </div>
                      <div className="text-right text-xs text-slate-500 space-y-1">
                        <div>
                          Matched Skills:{' '}
                          <strong className="text-emerald-600 font-bold">
                            {Array.isArray(selectedRecord.matched_skills) ? selectedRecord.matched_skills.length : 0}
                          </strong>
                        </div>
                        <div>
                          Missing Skills:{' '}
                          <strong className="text-rose-600 font-bold">
                            {missingData.all.length}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Skills Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Matched Skills */}
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600" />
                          Matched Skills ({Array.isArray(selectedRecord.matched_skills) ? selectedRecord.matched_skills.length : 0})
                        </h4>
                        {Array.isArray(selectedRecord.matched_skills) && selectedRecord.matched_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRecord.matched_skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No matched skills recorded.</p>
                        )}
                      </div>

                      {/* Missing Skills Breakdown */}
                      <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Missing Skills Breakdown ({missingData.all.length})
                        </h4>

                        {missingData.isCategorized ? (
                          <div className="space-y-3 text-xs">
                            {missingData.critical.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                                  Critical ({missingData.critical.length}):
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {missingData.critical.map((s, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {missingData.important.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                                  Important ({missingData.important.length}):
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {missingData.important.map((s, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {missingData.nice_to_have.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                                  Nice to Have ({missingData.nice_to_have.length}):
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {missingData.nice_to_have.map((s, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : missingData.all.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {missingData.all.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-medium border border-rose-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No missing skills detected.</p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Recommendations */}
              {(() => {
                const recData = getRecommendationsData(selectedRecord);
                if (recData.list.length === 0) return null;
                return (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      Actionable Recommendations ({recData.list.length})
                    </h4>
                    <ul className="space-y-2 text-xs text-amber-950">
                      {recData.list.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Link
                  to={`/optimizer?id=${selectedRecord.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Open in AI Resume Optimizer</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingRecordId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-2xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900">Delete Analysis Log?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete this analysis report from your history? This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingRecordId(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecord}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Report</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
