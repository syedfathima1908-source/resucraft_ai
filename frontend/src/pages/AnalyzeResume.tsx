import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileCheck2,
  Briefcase,
  Trash2,
  Target,
  Award,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Wand2,
} from 'lucide-react';

export interface ATSComponentData {
  name: string;
  score: number;
  max: number;
  percentage: number;
  description: string;
}

export interface ATSBreakdownData {
  total_score: number;
  max_score: number;
  formula_explanation: string;
  components: {
    keyword_match: ATSComponentData;
    tfidf_similarity: ATSComponentData;
    skill_coverage: ATSComponentData;
    resume_structure: ATSComponentData;
  };
  positive_factors: string[];
  negative_factors: string[];
}

export interface OptimizerRecommendation {
  category: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  explanation: string;
  action: string;
}

export interface OptimizerCategory {
  name: string;
  description: string;
  recommendations: OptimizerRecommendation[];
}

export interface SuggestedChange {
  original: string;
  improved: string;
  reason: string;
}

export interface OptimizerResultsData {
  categories: OptimizerCategory[];
  suggested_changes: SuggestedChange[];
}

interface AnalysisResultData {
  ats_score: number;
  similarity_score: number;
  skill_match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  critical_missing_skills?: string[];
  important_missing_skills?: string[];
  nice_to_have_missing_skills?: string[];
  total_jd_skills: number;
  total_resume_skills: number;
  recommendations: string[];
  resume_word_count: number;
  jd_word_count: number;
  ats_score_breakdown?: ATSBreakdownData;
  optimizer_results?: OptimizerResultsData;
}

export const AnalyzeResume: React.FC = () => {
  const { user } = useAuth();

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');

  // Drag & drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Validation error states
  const [fileError, setFileError] = useState<string | null>(null);
  const [jdError, setJdError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Submission & Backend analysis result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check valid PDF/DOCX file
  const isValidFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx =
      fileName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword';
    return isPdf || isDocx;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get readable file type name
  const getReadableFileType = (file: File): string => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      return 'PDF Document (.pdf)';
    }
    if (fileName.endsWith('.docx') || file.type.includes('word') || file.type.includes('wordprocessingml')) {
      return 'DOCX Document (.docx)';
    }
    return file.type || 'Document';
  };

  // Process file selection
  const processFile = (file: File) => {
    setFileError(null);
    setApiError(null);
    setAnalysisResult(null);

    if (!isValidFileType(file)) {
      setFileError('Invalid file format. Only PDF (.pdf) and DOCX (.docx) files are allowed.');
      setSelectedFile(null);
      return;
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${MAX_SIZE_MB}MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setAnalysisResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSampleJD = () => {
    setJobDescription(
      `We are seeking a Senior Full Stack Software Engineer to lead frontend and backend development across our core web applications.\n\nKey Responsibilities:\n- Architect and build scalable web applications using React, TypeScript, and Node.js.\n- Collaborate with product designers and AI engineers to integrate RESTful APIs and machine learning models.\n- Optimize web application performance, accessibility, and user experience.\n\nRequirements:\n- 4+ years of professional experience with modern JavaScript/TypeScript frameworks (React, Next.js, Vue).\n- Hands-on experience with backend services (Node.js, Express, Supabase, or PostgreSQL).\n- Strong understanding of state management, Git version control, and CI/CD pipelines.`
    );
    setJdError(null);
    setApiError(null);
  };

  // Submit to Python Backend API
  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ANALYZE DEBUG] handleAnalyzeSubmit TRIGGERED by form submit / button click', {
      selectedFile: selectedFile ? selectedFile.name : null,
      jobDescriptionLength: jobDescription.length,
      jobDescriptionTrimmed: jobDescription.trim().length,
      isSubmitting,
    });

    let hasError = false;
    setApiError(null);

    if (!selectedFile) {
      console.log('[ANALYZE DEBUG] Validation failed: selectedFile is missing');
      setFileError('Please upload a resume file (PDF or DOCX) to proceed.');
      hasError = true;
    } else if (!isValidFileType(selectedFile)) {
      console.log('[ANALYZE DEBUG] Validation failed: invalid file type', selectedFile.name);
      setFileError('Invalid file format. Only PDF (.pdf) and DOCX (.docx) files are supported.');
      hasError = true;
    } else {
      setFileError(null);
    }

    const trimmedJd = jobDescription.trim();
    if (!trimmedJd) {
      console.log('[ANALYZE DEBUG] Validation failed: jobDescription is empty');
      setJdError('Please enter or paste a target job description.');
      hasError = true;
    } else if (trimmedJd.length < 30) {
      console.log('[ANALYZE DEBUG] Validation failed: jobDescription too short', trimmedJd.length);
      setJdError('Job description is too short. Please enter a complete job posting (at least 30 characters).');
      hasError = true;
    } else {
      setJdError(null);
    }

    if (hasError) {
      console.log('[ANALYZE DEBUG] Early return in handleAnalyzeSubmit due to validation error.');
      return;
    }

    setIsSubmitting(true);
    setAnalysisResult(null);
    setSaveStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile!);
      formData.append('job_description', trimmedJd);

      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || json.error) {
        throw new Error(json.error || 'Backend analysis failed.');
      }

      setAnalysisResult(json.data);

      // Save to Supabase analysis_history table for the logged-in user
      if (user) {
        try {
          const extractedText = json.raw_resume_text || json.data?.raw_resume_text || null;
          const insertPayload: any = {
            user_id: user.id,
            resume_filename: selectedFile!.name,
            match_percentage: json.data.ats_score,
            matched_skills: json.data.matched_skills || [],
            missing_skills: {
              all: json.data.missing_skills || [],
              critical: json.data.critical_missing_skills || [],
              important: json.data.important_missing_skills || [],
              nice_to_have: json.data.nice_to_have_missing_skills || [],
            },
            recommendations: {
              list: json.data.recommendations || [],
              optimizer: json.data.optimizer_results || null,
            },
            resume_skills: {
              total: json.data.total_resume_skills,
            },
            job_description_skills: { total: json.data.total_jd_skills },
            raw_resume_text: extractedText,
          };

          let { data: dbData, error: dbError } = await supabase
            .from('analysis_history')
            .insert(insertPayload)
            .select();

          // Graceful fallback if database schema lacks raw_resume_text column (HTTP 400 / PGRST204)
          if (dbError && (dbError.code === 'PGRST204' || dbError.message?.includes('raw_resume_text') || dbError.message?.includes('column'))) {
            console.warn('[Supabase Schema Warning] raw_resume_text column missing on remote DB. Retrying insert without raw_resume_text. Please apply migration: 20260920_add_raw_resume_text.sql');
            delete insertPayload.raw_resume_text;
            const retry = await supabase
              .from('analysis_history')
              .insert(insertPayload)
              .select();
            dbData = retry.data;
            dbError = retry.error;
          }

          if (dbError) {
            console.error('Supabase history save error details:', {
              code: dbError.code,
              message: dbError.message,
              details: dbError.details,
              hint: dbError.hint,
            });
            setSaveStatus({
              success: false,
              message: `Analysis completed, but saving to history failed: ${dbError.message}`,
            });
          } else {
            if (dbData && dbData.length > 0) {
              setSavedRecordId(dbData[0].id);
            }
            setSaveStatus({
              success: true,
              message: 'Analysis report saved to your history.',
            });
          }
        } catch (dbErr: any) {
          console.error('Supabase insert exception:', dbErr);
          setSaveStatus({
            success: false,
            message: 'Analysis completed, but failed to save to history database.',
          });
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setApiError(
        err.message || 'Could not connect to backend server. Make sure Flask app is running at http://localhost:5000.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setJobDescription('');
    setFileError(null);
    setJdError(null);
    setApiError(null);
    setAnalysisResult(null);
    setSaveStatus(null);
    setSavedRecordId(null);
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const trimmedJdText = jobDescription.trim();
  const wordCount = trimmedJdText ? trimmedJdText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = jobDescription.length;

  return (
    <DashboardLayout title="Analyze Resume">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/10">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>PYTHON NLP & TF-IDF RESUME ENGINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Analyze Resume against Job Description
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Upload your resume in PDF or DOCX format and paste your target job posting to extract skill keywords, calculate TF-IDF match scores, and receive actionable AI recommendations.
            </p>
          </div>
        </div>

        {/* Backend API Error Alert */}
        {apiError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-900 text-sm flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-rose-950">Analysis Failed</h4>
              <p className="text-xs text-rose-800">{apiError}</p>
            </div>
            <button type="button" onClick={() => setApiError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Supabase History Save Notice */}
        {saveStatus && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-start gap-3 shadow-2xs ${
              saveStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {saveStatus.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <h4 className="font-bold">{saveStatus.success ? 'Saved to History' : 'History Notification'}</h4>
              <p className="text-xs opacity-90">{saveStatus.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setSaveStatus(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Analysis Results Display */}
        {analysisResult ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Explainable ATS Score Breakdown Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Explainable ATS Scoring Engine</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                    Transparent ATS Score Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Analyzed document: <span className="font-semibold text-slate-700">{selectedFile?.name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100 flex-shrink-0">
                  <div className="text-center min-w-32">
                    <span className="text-[11px] uppercase tracking-wider text-indigo-700 font-extrabold block">
                      Overall ATS Score
                    </span>
                    <span className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {analysisResult.ats_score}%
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Weighted Component Total</span>
                  </div>
                </div>
              </div>

              {/* Formula Explanation Callout */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs space-y-1.5 border border-slate-800">
                <div className="flex items-center justify-between text-indigo-300 font-bold uppercase tracking-wider text-[11px]">
                  <span>Scoring Formula & Component Weighting</span>
                  <span>100 Points Total</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                  {analysisResult.ats_score_breakdown?.formula_explanation ||
                    'Overall ATS Score = Keyword Match (35 pts max) + TF-IDF Similarity (30 pts max) + Skill Coverage (20 pts max) + Resume Structure (15 pts max)'}
                </p>
              </div>

              {/* 4 Interactive Component Cards */}
              {analysisResult.ats_score_breakdown?.components && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Component 1: Keyword & Skill Match */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        Keyword & Skill Match
                      </span>
                      <span className="text-xs font-black text-indigo-700">
                        {analysisResult.ats_score_breakdown.components.keyword_match.score} / 35.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.ats_score_breakdown.components.keyword_match.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {analysisResult.ats_score_breakdown.components.keyword_match.description}
                    </p>
                  </div>

                  {/* Component 2: TF-IDF Similarity */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        TF-IDF Vector Similarity
                      </span>
                      <span className="text-xs font-black text-blue-700">
                        {analysisResult.ats_score_breakdown.components.tfidf_similarity.score} / 30.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.ats_score_breakdown.components.tfidf_similarity.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {analysisResult.ats_score_breakdown.components.tfidf_similarity.description}
                    </p>
                  </div>

                  {/* Component 3: Skill Coverage */}
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-purple-600" />
                        Skill Coverage Ratio
                      </span>
                      <span className="text-xs font-black text-purple-700">
                        {analysisResult.ats_score_breakdown.components.skill_coverage.score} / 20.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.ats_score_breakdown.components.skill_coverage.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {analysisResult.ats_score_breakdown.components.skill_coverage.description}
                    </p>
                  </div>

                  {/* Component 4: Resume Content & Structure */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        Resume Content & Structure
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        {analysisResult.ats_score_breakdown.components.resume_structure.score} / 15.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.ats_score_breakdown.components.resume_structure.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {analysisResult.ats_score_breakdown.components.resume_structure.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Two-Column Diagnostic Breakdown: What Helped vs What Reduced Score */}
              {analysisResult.ats_score_breakdown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                  {/* Positive Factors ("What Helped") */}
                  <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-3">
                    <h5 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      What Helped Your ATS Score
                    </h5>
                    {analysisResult.ats_score_breakdown.positive_factors.length > 0 ? (
                      <ul className="space-y-2 text-xs text-slate-700">
                        {analysisResult.ats_score_breakdown.positive_factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No major positive boosts recorded.</p>
                    )}
                  </div>

                  {/* Negative Factors ("What Reduced Score") */}
                  <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/70 space-y-3">
                    <h5 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      What Reduced Your ATS Score
                    </h5>
                    {analysisResult.ats_score_breakdown.negative_factors.length > 0 ? (
                      <ul className="space-y-2 text-xs text-slate-700">
                        {analysisResult.ats_score_breakdown.negative_factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-700 italic">Great job! No major deductions detected.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Matched vs Missing Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    Matched Skills ({analysisResult.matched_skills.length})
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Found in Resume
                  </span>
                </div>

                {analysisResult.matched_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analysisResult.matched_skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/70"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No direct matching technical keywords detected.</p>
                )}
              </div>

              {/* Missing Skills Priority Analysis Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      Missing Skills Priority Breakdown ({analysisResult.missing_skills.length})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Categorized by requirement urgency & mention strength in job posting.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 self-start sm:self-auto">
                    Skill Gap Analysis
                  </span>
                </div>

                {analysisResult.missing_skills.length > 0 ? (
                  <div className="space-y-4">
                    {/* 1. Critical Missing Skills */}
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          Critical Skills ({(analysisResult.critical_missing_skills || []).length})
                        </h5>
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          High Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Essential core qualifications & heavily emphasized job requirements.
                      </p>
                      {(analysisResult.critical_missing_skills || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {analysisResult.critical_missing_skills!.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 text-xs font-semibold border border-rose-200"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-700 italic">No critical skill gaps identified!</p>
                      )}
                    </div>

                    {/* 2. Important Missing Skills */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-amber-600" />
                          Important Skills ({(analysisResult.important_missing_skills || []).length})
                        </h5>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          Medium Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Relevant technical skills & core domain competencies mentioned in the posting.
                      </p>
                      {(analysisResult.important_missing_skills || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {analysisResult.important_missing_skills!.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-700 italic">No important skill gaps identified!</p>
                      )}
                    </div>

                    {/* 3. Nice to Have Missing Skills */}
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          Nice to Have ({(analysisResult.nice_to_have_missing_skills || []).length})
                        </h5>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          Bonus / Optional
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Optional or preferred secondary skills & bonus qualifications.
                      </p>
                      {(analysisResult.nice_to_have_missing_skills || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {analysisResult.nice_to_have_missing_skills!.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 text-xs font-semibold border border-blue-200"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No nice-to-have skill gaps listed.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Great job! You possess all key skills mentioned in the job posting.
                  </p>
                )}
              </div>
            </div>

            {/* AI Resume Optimizer Transition CTA Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-purple-500/30">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold uppercase tracking-wider">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>DEDICATED OPTIMIZER ENGINE</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Ready to Optimize Your Resume Bullets & Keywords?
                </h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Navigate to the dedicated AI Resume Optimizer page to generate high-impact bullet point rewrites, strategic keyword placements, and priority improvement strategies for this analysis.
                </p>
              </div>

              <Link
                to={savedRecordId ? `/optimizer?id=${savedRecordId}` : '/optimizer'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>Open in AI Resume Optimizer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* AI Recommendations Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
                AI Optimization Recommendations
              </h4>

              <div className="space-y-3">
                {analysisResult.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3.5"
                  >
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-indigo-100">
                      {index + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Analyze Another Resume
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form Input State */
          <form onSubmit={handleAnalyzeSubmit} className="space-y-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              id="resume-file-input"
            />

            {/* Resume Upload Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    1. Upload Resume Document
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your resume file in PDF or DOCX format (Max 10MB).
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  PDF or DOCX only
                </span>
              </div>

              {fileError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{fileError}</p>
                  </div>
                  <button type="button" onClick={() => setFileError(null)} className="text-rose-500 hover:text-rose-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selectedFile ? (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-200 shadow-2xs">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                          {getReadableFileType(selectedFile)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>
                          Size: <strong className="text-slate-700 font-semibold">{formatFileSize(selectedFile.size)}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex-shrink-0"
                    >
                      Change File
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70 shadow-md scale-[1.01]'
                      : fileError
                      ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                      : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200/60 shadow-2xs mb-4">
                    <UploadCloud className={`w-7 h-7 ${isDragging ? 'animate-bounce' : ''}`} />
                  </div>

                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <p className="text-sm font-bold text-slate-800">
                      {isDragging ? 'Drop your resume file here' : 'Drag & drop your resume here'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports <strong className="text-slate-700">PDF (.pdf)</strong> and{' '}
                      <strong className="text-slate-700">DOCX (.docx)</strong> files up to 10MB
                    </p>
                  </div>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-300 shadow-2xs transition-all"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Job Description Input Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    2. Target Job Description
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste the job posting requirements to compare skill keywords and compute similarity scores.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleJD}
                  className="self-start sm:self-auto text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Load Sample Job Description
                </button>
              </div>

              {jdError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-semibold flex-1">{jdError}</span>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    if (jdError) setJdError(null);
                  }}
                  rows={7}
                  placeholder="Paste job title, responsibilities, technical requirements, and qualifications here..."
                  className={`w-full p-4 rounded-2xl text-sm font-sans text-slate-900 placeholder:text-slate-400 bg-slate-50/50 border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y ${
                    jdError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white'
                  }`}
                />

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Min 30 characters recommended</span>
                  <span className="font-medium text-slate-500">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'} | {charCount} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                <p className="font-semibold text-slate-700">Ready to analyze resume against job description?</p>
                <p>Calculates TF-IDF similarity, extracts skills, and generates recommendations via Flask backend.</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {(selectedFile || jobDescription) && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Clear All
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => console.log('[ANALYZE DEBUG] Direct button onClick event fired!')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze Resume
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};
