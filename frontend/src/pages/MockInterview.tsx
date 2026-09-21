import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { AnalysisHistoryRecord } from '../types/history';
import type {
  InterviewType,
  InterviewDifficulty,
  QuestionCount,
  QuestionItem,
  AnswerEvaluation,
  TranscriptItem,
  PerformanceReport,
  InterviewHistoryRecord,
  VoiceAudioState,
  TTSPlaybackState,
} from '../types/interview';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Calendar,
  Send,
  Sliders,
  ShieldCheck,
  Star,
  Clock,
  Check,
  X,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Type,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export const MockInterview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAnalysisId = searchParams.get('analysisId');

  // Stage state: 'setup' | 'active' | 'report' | 'history'
  const [activeStage, setActiveStage] = useState<'setup' | 'active' | 'report' | 'history'>('setup');

  // Setup options
  const [analysisRecords, setAnalysisRecords] = useState<AnalysisHistoryRecord[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
  const [numQuestions, setNumQuestions] = useState<QuestionCount>(5);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Active Interview state
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);

  // Adaptive follow-up state
  const [followUpAnswer, setFollowUpAnswer] = useState<string>('');
  const [followUpEvaluation, setFollowUpEvaluation] = useState<AnswerEvaluation | null>(null);

  // Transcript accumulator
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  // Final Performance Report state
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<PerformanceReport | null>(null);
  const [isSavedToHistory, setIsSavedToHistory] = useState<boolean>(false);

  // History tab state
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<InterviewHistoryRecord | null>(null);

  // VOICE / AUDIO ENGINE STATES
  const [sttStatus, setSttStatus] = useState<VoiceAudioState>('idle');
  const [sttErrorMsg, setSttErrorMsg] = useState<string | null>(null);
  const [isManualTextMode, setIsManualTextMode] = useState<boolean>(false);
  const [ttsStatus, setTtsStatus] = useState<TTSPlaybackState>('idle');

  // References for STT and state synchronization
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const lastSpokenQuestionIdxRef = useRef<number>(-1);
  const candidateAnswerRef = useRef<string>('');
  const followUpAnswerRef = useRef<string>('');

  // Keep refs in sync with state
  const updateCandidateAnswer = (text: string) => {
    candidateAnswerRef.current = text;
    setCandidateAnswer(text);
  };

  const updateFollowUpAnswer = (text: string) => {
    followUpAnswerRef.current = text;
    setFollowUpAnswer(text);
  };

  // Helper to resolve natural English voice from browser speechSynthesis
  const getEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    return (
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Microsoft') ||
            v.name.includes('Samantha') ||
            v.name.includes('Jenny') ||
            v.name.includes('Guy'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    );
  };

  // Listen for asynchronous voice loading in Chromium
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[TTS Debug] voices available asynchronously. Count:', voices.length);
      };
    }
  }, []);

  // Check microphone permission state via Navigator Permissions API (non-destructive)
  const checkMicrophonePermission = async (): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as any });
        console.log('[STT Debug] navigator.permissions.query state:', status.state);
        return status.state as 'granted' | 'prompt' | 'denied';
      } catch (err) {
        console.log('[STT Debug] navigator.permissions.query not supported for microphone:', err);
      }
    }
    return 'unknown';
  };

  // Check Web Speech Recognition support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[STT Debug] SpeechRecognition API is unsupported in this browser.');
      setSttStatus('unsupported');
      setIsManualTextMode(true);
      setSttErrorMsg('Browser Speech Recognition API is unsupported in this browser. Text Fallback Mode enabled.');
    } else {
      console.log('[STT Debug] SpeechRecognition API is supported.');
      checkMicrophonePermission().then((permState) => {
        if (permState === 'denied') {
          console.warn('[STT Debug] Microphone permission is explicitly DENIED in browser settings.');
          setSttStatus('error');
          setSttErrorMsg('Microphone access is blocked in browser settings. Please allow microphone access or use Text Fallback Mode.');
          setIsManualTextMode(true);
        } else {
          setSttStatus('ready');
          setSttErrorMsg(null);
        }
      });
    }
  }, []);

  // TEXT-TO-SPEECH (TTS) SPEAKER FUNCTION
  const speakQuestionTTS = (text: string) => {
    console.log('[TTS Debug] speak called for text:', text.substring(0, 50));
    if (!('speechSynthesis' in window)) {
      console.warn('[TTS Debug] window.speechSynthesis is UNSUPPORTED in this browser.');
      setTtsStatus('idle');
      return;
    }

    try {
      // Clear any ongoing speech before starting new question
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.volume = 1.0;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const availableVoices = window.speechSynthesis.getVoices();
      console.log('[TTS Debug] voices available count:', availableVoices.length);

      const selectedVoice = getEnglishVoice();
      if (selectedVoice) {
        console.log('[TTS Debug] selected voice:', selectedVoice.name, `(${selectedVoice.lang})`);
        utterance.voice = selectedVoice;
      } else {
        console.log('[TTS Debug] selected voice: (default browser voice)');
      }

      console.log('[TTS Debug] utterance created successfully.');

      utterance.onstart = () => {
        console.log('[TTS Debug] onstart fired! AI question voice audio output is actively playing.');
        setTtsStatus('speaking');
      };

      utterance.onend = () => {
        console.log('[TTS Debug] onend fired. AI question voice audio completed.');
        setTtsStatus('idle');
      };

      utterance.onerror = (e) => {
        console.warn('[TTS Debug] onerror fired:', e.error, e);
        setTtsStatus('idle');
      };

      console.log('[TTS Debug] Invoking window.speechSynthesis.speak(utterance)...');
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[TTS Debug] Exception in speakQuestionTTS:', err);
      setTtsStatus('idle');
    }
  };

  const pauseTTS = () => {
    if ('speechSynthesis' in window && ttsStatus === 'speaking') {
      window.speechSynthesis.pause();
      setTtsStatus('paused');
    }
  };

  const resumeTTS = () => {
    if ('speechSynthesis' in window && ttsStatus === 'paused') {
      window.speechSynthesis.resume();
      setTtsStatus('speaking');
    }
  };

  const stopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTtsStatus('idle');
    }
  };

  // SPEECH-TO-TEXT (STT) RECORDING FUNCTIONS
  const startListeningSTT = (isFollowUp = false) => {
    console.log('[STT Debug] startListeningSTT initiated. isFollowUp:', isFollowUp);
    stopTTS();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[STT Debug] Cannot start STT: SpeechRecognition API missing.');
      setSttStatus('unsupported');
      setIsManualTextMode(true);
      return;
    }

    // Safely abort previous recognition instance if running
    if (recognitionRef.current) {
      try {
        console.log('[STT Debug] Cleaning up previous SpeechRecognition instance...');
        recognitionRef.current.onstart = null;
        recognitionRef.current.onaudiostart = null;
        recognitionRef.current.onsoundstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onsoundend = null;
        recognitionRef.current.onaudioend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('[STT Debug] Exception aborting previous recognition instance:', err);
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      // Capture base text from ref prior to this recording burst
      const baseText = isFollowUp ? followUpAnswerRef.current : candidateAnswerRef.current;
      console.log('[STT Debug] SpeechRecognition created. lang: en-US, continuous: true, interimResults: true, maxAlternatives: 1. Base text length:', baseText.length);

      recognition.onstart = () => {
        console.log('[STT Debug] Event: onstart - SpeechRecognition engine started.');
        isListeningRef.current = true;
        setSttStatus('listening');
        setSttErrorMsg(null);
      };

      recognition.onaudiostart = () => {
        console.log('[STT Debug] Event: onaudiostart - Audio capture from microphone has begun.');
      };

      recognition.onsoundstart = () => {
        console.log('[STT Debug] Event: onsoundstart - Sound has been detected by microphone.');
      };

      recognition.onspeechstart = () => {
        console.log('[STT Debug] Event: onspeechstart - Speech has been recognized in audio stream!');
      };

      recognition.onresult = (event: any) => {
        console.log(`[STT Debug] Event: onresult - Fired! resultIndex: ${event.resultIndex}, total results: ${event.results.length}`);
        
        let sessionSpeech = '';
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          const confidence = event.results[i][0].confidence;
          console.log(`[STT Debug] Result [${i}] (isFinal=${isFinal}, confidence=${confidence}): "${piece}"`);
          sessionSpeech += piece + ' ';
        }

        const combinedText = baseText
          ? (baseText + ' ' + sessionSpeech).replace(/\s+/g, ' ').trim()
          : sessionSpeech.replace(/\s+/g, ' ').trim();

        console.log(`[STT Debug] Live transcript updated: "${combinedText}"`);

        if (isFollowUp) {
          updateFollowUpAnswer(combinedText);
        } else {
          updateCandidateAnswer(combinedText);
        }
      };

      recognition.onspeechend = () => {
        console.log('[STT Debug] Event: onspeechend - Speech in audio stream has stopped.');
      };

      recognition.onsoundend = () => {
        console.log('[STT Debug] Event: onsoundend - Sound in audio stream has stopped.');
      };

      recognition.onaudioend = () => {
        console.log('[STT Debug] Event: onaudioend - Audio capture session ended.');
      };

      recognition.onerror = (event: any) => {
        console.warn(`[STT Debug] Event: onerror - Code: "${event.error}"`, event);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.error('[STT Debug] Microphone permission or service denied.');
          setSttStatus('error');
          setSttErrorMsg('Microphone access was denied. Please allow microphone access or use Text Fallback Mode.');
          setIsManualTextMode(true);
        } else if (event.error === 'audio-capture') {
          console.error('[STT Debug] Audio capture hardware issue.');
          setSttStatus('error');
          setSttErrorMsg('Microphone audio capture failed. Ensure mic is connected and allowed.');
        } else if (event.error === 'network') {
          console.warn('[STT Debug] Speech recognition network service offline.');
          setSttStatus('error');
          setSttErrorMsg('Speech recognition network error. Transcript preserved. You can retry or edit text.');
        } else if (event.error === 'no-speech') {
          console.log('[STT Debug] no-speech: Temporary silence detected.');
        } else if (event.error === 'aborted') {
          console.log('[STT Debug] SpeechRecognition aborted intentionally.');
        } else {
          console.warn(`[STT Debug] Generic error: ${event.error}`);
          setSttStatus('error');
          setSttErrorMsg(`Speech recognition note (${event.error}). Transcript preserved.`);
        }
      };

      recognition.onend = () => {
        console.log('[STT Debug] Event: onend - SpeechRecognition session ended.');
        isListeningRef.current = false;
        setSttStatus((prev) => (prev === 'listening' ? 'ready' : prev));
      };

      recognitionRef.current = recognition;
      console.log('[STT Debug] Invoking recognition.start()...');
      recognition.start();
    } catch (err: any) {
      console.error('[STT Debug] Exception during SpeechRecognition start:', err);
      setSttStatus('error');
      setSttErrorMsg(`Failed to start speech recognition: ${err.message || 'Unknown error'}`);
    }
  };

  const stopListeningSTT = () => {
    console.log('[STT Debug] stopListeningSTT called.');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onaudiostart = null;
        recognitionRef.current.onsoundstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onsoundend = null;
        recognitionRef.current.onaudioend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[STT Debug] Exception stopping SpeechRecognition:', err);
      }
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setSttStatus((prev) => (prev === 'listening' ? 'ready' : prev));
  };

  const reRecordAnswer = (isFollowUp = false) => {
    console.log('[STT Debug] reRecordAnswer triggered. isFollowUp:', isFollowUp);
    stopListeningSTT();
    if (isFollowUp) {
      updateFollowUpAnswer('');
    } else {
      updateCandidateAnswer('');
    }
    startListeningSTT(isFollowUp);
  };

  // Load candidate's analyzed resumes from Supabase
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAnalysisRecords(data as AnalysisHistoryRecord[]);
          if (initialAnalysisId) {
            const match = data.find((r) => r.id === initialAnalysisId);
            if (match) setSelectedAnalysisId(match.id);
            else if (data.length > 0) setSelectedAnalysisId(data[0].id);
          } else if (data.length > 0) {
            setSelectedAnalysisId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching user analysis records:', err);
      }
    };

    fetchAnalyses();
  }, [user, initialAnalysisId]);

  // Load completed interview history from Supabase
  const fetchInterviewHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('interview_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInterviewHistory(data as InterviewHistoryRecord[]);
      }
    } catch (err) {
      console.error('Error fetching interview history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeStage === 'history') {
      fetchInterviewHistory();
    }
  }, [activeStage]);

  // Trigger TTS whenever a new question is activated
  useEffect(() => {
    if (
      activeStage === 'active' &&
      questions.length > 0 &&
      currentQuestionIdx < questions.length &&
      !currentEvaluation &&
      lastSpokenQuestionIdxRef.current !== currentQuestionIdx
    ) {
      lastSpokenQuestionIdxRef.current = currentQuestionIdx;
      const qText = questions[currentQuestionIdx].question;
      console.log(`[TTS Debug] Automatic question speak for index ${currentQuestionIdx + 1}: "${qText}"`);
      speakQuestionTTS(qText);
    }

    return () => {
      stopTTS();
    };
  }, [activeStage, currentQuestionIdx, questions, currentEvaluation]);

  // Clean up voice engine on component unmount
  useEffect(() => {
    return () => {
      stopTTS();
      stopListeningSTT();
    };
  }, []);

  // Start new interview setup
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    const targetAnalysisId = selectedAnalysisId || (analysisRecords.length > 0 ? analysisRecords[0].id : '');
    const selectedRecord = analysisRecords.find((r) => r.id === targetAnalysisId);

    console.log('[Interview Setup] Start button clicked');
    console.log('[Interview Setup] selected analysis ID:', targetAnalysisId);
    console.log('[Interview Setup] selected resume filename:', selectedRecord?.resume_filename || 'N/A');
    console.log('[Interview Setup] interview type:', interviewType);
    console.log('[Interview Setup] difficulty:', difficulty);
    console.log('[Interview Setup] question count:', numQuestions);
    console.log('[Interview Setup] validation result:', selectedRecord ? 'VALID' : 'INVALID - No analyzed resume record found');

    if (!selectedRecord) {
      const errMsg = 'Please select a valid analyzed resume to start the interview.';
      setSetupError(errMsg);
      console.error('[Interview Setup] Validation failed:', errMsg);
      return;
    }

    // Ensure selectedAnalysisId state is kept in sync if fallback was used
    if (!selectedAnalysisId && targetAnalysisId) {
      setSelectedAnalysisId(targetAnalysisId);
    }

    setIsGeneratingQuestions(true);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setTranscript([]);
    setFinalReport(null);
    setCurrentEvaluation(null);
    updateCandidateAnswer('');
    updateFollowUpAnswer('');
    setFollowUpEvaluation(null);

    const rawResumeText = selectedRecord?.raw_resume_text?.trim() || '';

    // Task 16: Development logging without exposing full resume text
    console.log('[Interview Setup] Development Diagnostics:', {
      selectedAnalysisId: targetAnalysisId,
      rawResumeTextExists: Boolean(selectedRecord?.raw_resume_text),
      rawResumeTextCharCount: rawResumeText.length,
      interviewType,
      numQuestions,
    });

    // Task 12: Handle historical records missing raw_resume_text
    if (!rawResumeText) {
      const errMsg =
        'The selected historical analysis record is missing stored resume text. ' +
        'Analysis records created prior to raw text storage cannot generate resume-grounded questions. ' +
        'Please upload and analyze your resume on the Analyze Resume page to start a new interview session.';
      setSetupError(errMsg);
      console.warn('[Interview Setup] Missing raw_resume_text for analysis record ID:', targetAnalysisId);
      return;
    }

    console.log('[Interview Setup] API request start -> http://localhost:5000/api/interview/generate-questions');

    try {
      const res = await fetch('http://localhost:5000/api/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: rawResumeText,
          interview_type: interviewType,
          difficulty: difficulty,
          num_questions: numQuestions,
        }),
      });

      console.log('[Interview Setup] API response status:', res.status, res.statusText);

      const data = await res.json();
      console.log('[Interview Setup] API response data:', data);

      if (res.ok && data.status === 'success' && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentQuestionIdx(0);
        setActiveStage('active');
        console.log('[Interview Setup] Navigation/state transition -> Stage set to "active", total questions:', data.questions.length);
      } else {
        const errMsg = data.error || 'Failed to generate grounded interview questions. Please try again.';
        setSetupError(errMsg);
        console.error('[Interview Setup] Question generation failed:', errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Network error connecting to backend API (http://localhost:5000). Ensure the backend is running.';
      setSetupError(errMsg);
      console.error('[Interview Setup] Error generating interview questions:', err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Submit Transcribed Answer & get 5-metric evaluation
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || isEvaluating) return;
    stopListeningSTT();
    stopTTS();
    setIsEvaluating(true);

    const currentQ = questions[currentQuestionIdx];
    const selectedRecord = analysisRecords.find((r) => r.id === selectedAnalysisId);
    const rawResumeText = selectedRecord?.raw_resume_text || '';

    try {
      const res = await fetch('http://localhost:5000/api/interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: currentQ.question,
          candidate_answer: candidateAnswer,
          resume_text: rawResumeText,
          interview_type: interviewType,
          difficulty: difficulty,
          is_follow_up: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.evaluation) {
          setCurrentEvaluation(data.evaluation);

          // If adaptive follow-up is triggered, speak it out loud via TTS
          if (data.evaluation.needs_follow_up && data.evaluation.follow_up_question) {
            speakQuestionTTS(data.evaluation.follow_up_question);
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Adaptive Follow-Up Answer
  const handleSubmitFollowUp = async () => {
    if (!followUpAnswer.trim() || isEvaluating || !currentEvaluation?.follow_up_question) return;
    stopListeningSTT();
    stopTTS();
    setIsEvaluating(true);

    const selectedRecord = analysisRecords.find((r) => r.id === selectedAnalysisId);
    const rawResumeText = selectedRecord?.raw_resume_text || '';

    try {
      const res = await fetch('http://localhost:5000/api/interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: currentEvaluation.follow_up_question,
          candidate_answer: followUpAnswer,
          resume_text: rawResumeText,
          interview_type: interviewType,
          difficulty: difficulty,
          is_follow_up: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.evaluation) {
          setFollowUpEvaluation(data.evaluation);
        }
      }
    } catch (err) {
      console.error('Error evaluating follow-up answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Advance to next question or finalize
  const handleNextQuestion = () => {
    if (!currentEvaluation) return;
    stopTTS();
    stopListeningSTT();

    const currentQ = questions[currentQuestionIdx];
    const newItem: TranscriptItem = {
      id: currentQ.id,
      question: currentQ.question,
      category: currentQ.category,
      candidate_answer: candidateAnswer,
      evaluation: currentEvaluation,
      follow_up_question: currentEvaluation.follow_up_question,
      follow_up_answer: followUpAnswer || undefined,
      follow_up_evaluation: followUpEvaluation || undefined,
    };

    const updatedTranscript = [...transcript, newItem];
    setTranscript(updatedTranscript);

    // Reset state AND refs for next question to guarantee 100% transcript isolation
    updateCandidateAnswer('');
    updateFollowUpAnswer('');
    setCurrentEvaluation(null);
    setFollowUpEvaluation(null);

    if (currentQuestionIdx + 1 < questions.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      handleFinalizeInterview(updatedTranscript);
    }
  };

  // Finalize interview and generate performance report
  const handleFinalizeInterview = async (finalTranscript: TranscriptItem[]) => {
    setIsFinalizing(true);
    stopTTS();
    stopListeningSTT();
    const selectedRecord = analysisRecords.find((r) => r.id === selectedAnalysisId);

    try {
      const res = await fetch('http://localhost:5000/api/interview/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_type: interviewType,
          difficulty: difficulty,
          num_questions: numQuestions,
          transcript: finalTranscript,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.report_data) {
          setFinalReport(data.report_data);
          setActiveStage('report');

          if (user && selectedRecord) {
            saveToSupabaseHistory(data.report_data, finalTranscript, selectedRecord);
          }
        }
      }
    } catch (err) {
      console.error('Error finalizing interview:', err);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Save interview record to Supabase
  const saveToSupabaseHistory = async (
    repData: PerformanceReport,
    trans: TranscriptItem[],
    rec: AnalysisHistoryRecord
  ) => {
    try {
      const payload: any = {
        user_id: user!.id,
        analysis_id: rec.id,
        resume_filename: rec.resume_filename,
        interview_type: interviewType,
        difficulty: difficulty,
        total_questions: numQuestions,
        report: repData.report,
        transcript: trans,
      };

      if (repData.overall_score !== undefined) {
        payload.overall_score = repData.overall_score;
      }
      if (repData.performance_scores !== undefined) {
        payload.performance_scores = repData.performance_scores;
      }

      const { error } = await supabase.from('interview_history').insert(payload);

      if (!error) {
        setIsSavedToHistory(true);
      } else {
        console.error('Supabase interview history save error:', error);
      }
    } catch (err) {
      console.error('Exception saving interview history:', err);
    }
  };

  return (
    <DashboardLayout title="Voice AI Mock Interview & Preparation">
      <div className="space-y-8">
        {/* Header Banner & Navigation Tabs */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>FEATURE 7 • VOICE-FIRST AI INTERVIEW ENGINE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Voice AI Resume-Grounded Mock Interview
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Experience a realistic voice interview: the AI interviewer speaks questions aloud using Text-to-Speech (TTS), while you answer via your microphone with live Speech-to-Text (STT) transcription and transcript review.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 flex-wrap">
              <button
                onClick={() => setActiveStage('setup')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeStage === 'setup'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Setup Interview
              </button>
              {questions.length > 0 && (
                <button
                  onClick={() => setActiveStage('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeStage === 'active'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Active Voice Room
                </button>
              )}
              {finalReport && (
                <button
                  onClick={() => setActiveStage('report')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeStage === 'report'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Report Card
                </button>
              )}
              <button
                onClick={() => setActiveStage('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeStage === 'history'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                History & Review
              </button>
            </div>
          </div>
        </div>

        {/* STAGE 1: INTERVIEW SETUP */}
        {activeStage === 'setup' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                Configure Voice Mock Interview Session
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Select your analyzed resume and practice preferences. The AI will speak questions using TTS and record your spoken answers via microphone.
              </p>
            </div>

            {analysisRecords.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>No Analyzed Resumes Found</span>
                </div>
                <p>Please analyze your resume first to generate verified candidate facts for your voice mock interview.</p>
                <button
                  onClick={() => navigate('/analyze')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                >
                  Go to Analyze Resume
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartInterview} className="space-y-6">
                {/* Setup Error Alert */}
                {setupError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">Failed to Start Mock Interview</div>
                      <div>{setupError}</div>
                    </div>
                  </div>
                )}

                {/* 1. Select Analyzed Resume */}
                <div className="space-y-2">
                  <label htmlFor="resume-select" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Select Analyzed Resume (Source of Truth)
                  </label>
                  <select
                    id="resume-select"
                    value={selectedAnalysisId}
                    onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {analysisRecords.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.resume_filename} — Match: {rec.match_percentage}% ({new Date(rec.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Interview Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Interview Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'technical', label: 'Technical', desc: 'Code architecture & frameworks' },
                      { id: 'behavioral', label: 'HR / Behavioral', desc: 'STAR-format situation questions' },
                      { id: 'project', label: 'Project Deep-Dive', desc: 'In-depth project breakdown' },
                      { id: 'mixed', label: 'Mixed', desc: 'Balanced combination' },
                    ].map((type) => (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setInterviewType(type.id as InterviewType)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          interviewType === type.id
                            ? 'bg-blue-50/80 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{type.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Difficulty Level & Question Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Difficulty Level
                    </label>
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'easy', label: 'Easy' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'hard', label: 'Hard' },
                      ].map((d) => (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => setDifficulty(d.id as InterviewDifficulty)}
                          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            difficulty === d.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Number of Questions
                    </label>
                    <div className="flex items-center gap-2">
                      {[5, 10, 15].map((cnt) => (
                        <button
                          type="button"
                          key={cnt}
                          onClick={() => setNumQuestions(cnt as QuestionCount)}
                          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            numQuestions === cnt
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {cnt} Questions
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isGeneratingQuestions}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Grounded Questions...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Start Voice AI Mock Interview</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STAGE 2: ACTIVE VOICE INTERVIEW ROOM */}
        {activeStage === 'active' && questions.length > 0 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Active Progress Header */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                  {currentQuestionIdx + 1}/{questions.length}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {questions[currentQuestionIdx].category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 uppercase">
                      {difficulty} Difficulty
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Question {currentQuestionIdx + 1} of {questions.length}
                  </h3>
                </div>
              </div>

              {/* Progress Bar & Audio Fallback Toggle */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsManualTextMode(!isManualTextMode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Type className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isManualTextMode ? 'Voice Mode' : 'Text Fallback'}</span>
                </button>

                <div className="w-36 bg-slate-100 h-2.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI INTERVIEWER SPOKEN QUESTION CARD */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-lg space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <Volume2 className="w-4 h-4" />
                  <span>AI INTERVIEWER QUESTION (SPOKEN ALOUD)</span>
                </div>

                {/* TTS Playback Audio Controls */}
                <div className="flex items-center gap-2">
                  {ttsStatus === 'speaking' ? (
                    <button
                      onClick={pauseTTS}
                      className="p-2 rounded-xl bg-slate-800 text-blue-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Pause Voice Question"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : ttsStatus === 'paused' ? (
                    <button
                      onClick={resumeTTS}
                      className="p-2 rounded-xl bg-slate-800 text-blue-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Resume Voice Question"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => speakQuestionTTS(questions[currentQuestionIdx].question)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-bold transition-colors border border-blue-500/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Voice</span>
                  </button>
                </div>
              </div>

              {/* On-screen Question Text */}
              <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-100">
                "{questions[currentQuestionIdx].question}"
              </p>

              {ttsStatus === 'speaking' && (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800 animate-pulse">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Interviewer is speaking question...</span>
                </div>
              )}
            </div>

            {/* CANDIDATE VOICE RECORDING & TRANSCRIPT REVIEW CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-600" />
                    Candidate Voice Response & Transcript Review
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Speak into your microphone. Review, edit, or re-record your transcript before submitting for evaluation.
                  </p>
                </div>

                {/* Voice Status Pill */}
                <div className="self-start sm:self-auto">
                  {sttStatus === 'listening' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 animate-pulse">
                      <Activity className="w-3.5 h-3.5 text-rose-600" />
                      {candidateAnswer.trim() || followUpAnswer.trim()
                        ? 'Listening — Transcribing Speech...'
                        : 'Listening — Speak into your microphone...'}
                    </span>
                  ) : sttStatus === 'granting_permission' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      Checking Mic Access...
                    </span>
                  ) : sttStatus === 'ready' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Microphone Ready
                    </span>
                  ) : sttStatus === 'unsupported' || isManualTextMode ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      <Type className="w-3.5 h-3.5 text-slate-500" />
                      Text Input Mode
                    </span>
                  ) : sttStatus === 'error' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Mic Fallback Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                      Microphone Idle
                    </span>
                  )}
                </div>
              </div>

              {/* Error Notice */}
              {sttErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{sttErrorMsg}</span>
                </div>
              )}

              {/* VOICE CONTROLS & RECORD BUTTON */}
              {!isManualTextMode && (
                <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  {sttStatus !== 'listening' ? (
                    <button
                      type="button"
                      onClick={() => startListeningSTT(false)}
                      disabled={currentEvaluation !== null}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{candidateAnswer ? 'Resume Voice Recording' : 'Start Recording Answer'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopListeningSTT}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer animate-pulse"
                    >
                      <MicOff className="w-4 h-4 text-rose-400" />
                      <span>Stop Recording Speech</span>
                    </button>
                  )}

                  {candidateAnswer && (
                    <button
                      type="button"
                      onClick={() => reRecordAnswer(false)}
                      disabled={sttStatus === 'listening' || currentEvaluation !== null}
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-record Answer</span>
                    </button>
                  )}
                </div>
              )}

              {/* Transcribed Answer Review Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Transcribed Answer Text (Editable for Review)</span>
                  <span>{candidateAnswer.split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <textarea
                  rows={5}
                  value={candidateAnswer}
                  onChange={(e) => updateCandidateAnswer(e.target.value)}
                  disabled={currentEvaluation !== null}
                  placeholder={
                    isManualTextMode
                      ? 'Type your detailed answer here...'
                      : 'Your spoken answer transcript will appear here in real time. You can edit text manually before submitting.'
                  }
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 disabled:opacity-75 resize-y"
                />
              </div>

              {!currentEvaluation && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!candidateAnswer.trim() || isEvaluating}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Evaluating Transcribed Answer...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Answer for AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* REAL-TIME ANSWER EVALUATION DRAWER */}
            {currentEvaluation && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200/80 shadow-md space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-bold text-slate-900">AI Evaluation Feedback</h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Evaluation Complete
                  </span>
                </div>

                {/* 7 Detailed Qualitative Feedback Sections */}
                <div className="space-y-4">
                  {/* 1. What You Did Well (Render ONLY if length > 0) */}
                  {currentEvaluation.what_was_done_well && currentEvaluation.what_was_done_well.length > 0 && (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        What You Did Well
                      </span>
                      <ul className="list-disc list-inside text-xs text-emerald-950 font-medium space-y-1 leading-relaxed">
                        {currentEvaluation.what_was_done_well.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 2. What You Missed (Render ONLY if length > 0) */}
                  {currentEvaluation.what_was_missing && currentEvaluation.what_was_missing.length > 0 && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        What You Missed
                      </span>
                      <ul className="list-disc list-inside text-xs text-amber-950 font-medium space-y-1 leading-relaxed">
                        {currentEvaluation.what_was_missing.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 3. What Was Incorrect (Render ONLY if length > 0) */}
                  {currentEvaluation.what_was_incorrect && currentEvaluation.what_was_incorrect.length > 0 && (
                    <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-1.5">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <X className="w-4 h-4 text-rose-600" />
                        What Was Incorrect
                      </span>
                      <ul className="list-disc list-inside text-xs text-rose-950 font-medium space-y-1 leading-relaxed">
                        {currentEvaluation.what_was_incorrect.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 4. What Was Irrelevant (Render ONLY if length > 0) */}
                  {currentEvaluation.what_was_irrelevant && currentEvaluation.what_was_irrelevant.length > 0 && (
                    <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 space-y-1.5">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-purple-600" />
                        What Was Irrelevant
                      </span>
                      <ul className="list-disc list-inside text-xs text-purple-950 font-medium space-y-1 leading-relaxed">
                        {currentEvaluation.what_was_irrelevant.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 5. What You Should Improve (Render ONLY if length > 0) */}
                  {currentEvaluation.what_could_improve && currentEvaluation.what_could_improve.length > 0 && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 space-y-1.5">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sliders className="w-4 h-4 text-blue-600" />
                        What You Should Improve
                      </span>
                      <ul className="list-disc list-inside text-xs text-blue-950 font-medium space-y-1 leading-relaxed">
                        {currentEvaluation.what_could_improve.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 6. How to Structure a Better Answer (No duplicate numbers) */}
                  {currentEvaluation.better_answer_guidance && currentEvaluation.better_answer_guidance.length > 0 && (
                    <div className="bg-indigo-950 text-white rounded-2xl p-5 border border-indigo-800 space-y-2">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        How to Structure a Better Answer
                      </span>
                      <ol className="list-decimal list-inside text-xs text-indigo-100 font-sans space-y-1.5 leading-relaxed pt-1">
                        {currentEvaluation.better_answer_guidance.map((item, idx) => {
                          const cleaned = item.replace(/^(?:\d+[\.\)]\s*|Step\s*\d+[\:\.\)]\s*|\-\s*)/i, '').trim();
                          return cleaned ? <li key={idx}>{cleaned}</li> : null;
                        })}
                      </ol>
                    </div>
                  )}

                  {/* 7. Example of a Stronger Answer */}
                  {(currentEvaluation.strong_answer_example || currentEvaluation.feedback?.strong_answer_example) && (
                    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        Example of a Stronger Answer
                      </span>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed pt-1">
                        "{currentEvaluation.strong_answer_example || currentEvaluation.feedback?.strong_answer_example}"
                      </p>
                    </div>
                  )}
                </div>

                {/* ADAPTIVE FOLLOW-UP SECTION */}
                {currentEvaluation.needs_follow_up && currentEvaluation.follow_up_question && (
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <Bot className="w-4 h-4" />
                        <span>ADAPTIVE FOLLOW-UP QUESTION (SPOKEN ALOUD)</span>
                      </div>
                      <button
                        onClick={() => speakQuestionTTS(currentEvaluation.follow_up_question!)}
                        className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-bold"
                      >
                        <RotateCcw className="w-3 h-3" /> Replay Voice
                      </button>
                    </div>

                    <p className="text-sm font-bold text-white leading-relaxed">
                      "{currentEvaluation.follow_up_question}"
                    </p>

                    {!followUpEvaluation ? (
                      <div className="space-y-3 pt-2">
                        {!isManualTextMode && (
                          <div className="flex items-center gap-3">
                            {sttStatus !== 'listening' ? (
                              <button
                                type="button"
                                onClick={() => startListeningSTT(true)}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                              >
                                <Mic className="w-3.5 h-3.5" /> Start Recording Follow-Up
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={stopListeningSTT}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse"
                              >
                                <MicOff className="w-3.5 h-3.5 text-rose-400" /> Stop Follow-Up Mic
                              </button>
                            )}
                          </div>
                        )}

                        <textarea
                          rows={3}
                          value={followUpAnswer}
                          onChange={(e) => setFollowUpAnswer(e.target.value)}
                          placeholder="Spoken or typed follow-up answer transcript..."
                          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-400"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleSubmitFollowUp}
                            disabled={!followUpAnswer.trim() || isEvaluating}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                          >
                            Submit Follow-Up Answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800/90 rounded-xl p-3 text-xs text-emerald-300 border border-emerald-500/30">
                        <Check className="w-4 h-4 inline-block mr-1 text-emerald-400" />
                        <strong>Follow-Up Feedback: </strong> {followUpEvaluation.feedback.done_well}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Trigger for Next Question */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={handleNextQuestion}
                    disabled={isFinalizing}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    {isFinalizing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Compiling Final Performance Report...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {currentQuestionIdx + 1 < questions.length ? 'Next Question' : 'Finish & View Performance Report'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 3: FINAL PERFORMANCE REPORT */}
        {activeStage === 'report' && finalReport && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>VOICE INTERVIEW COMPLETED</span>
              </div>
              <h3 className="text-2xl font-black text-white">Final Performance Report Card</h3>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                {finalReport.overall_feedback || 'Review your comprehensive interview performance feedback below.'}
              </p>
            </div>

            {/* Detailed Qualitative Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strong Areas */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Strong Performance Areas
                </h4>
                <ul className="space-y-2">
                  {(finalReport.report.strong_areas || []).map((st, i) => (
                    <li key={i} className="text-xs text-slate-700 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60 flex items-start gap-2 font-medium">
                      <Star className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Areas to Improve
                </h4>
                <ul className="space-y-2">
                  {(finalReport.report.areas_to_improve || []).map((imp, i) => (
                    <li key={i} className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 flex items-start gap-2 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Answering Patterns to Improve */}
            {finalReport.report.answering_patterns_to_improve && finalReport.report.answering_patterns_to_improve.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  Answering Patterns to Improve
                </h4>
                <ul className="space-y-2">
                  {finalReport.report.answering_patterns_to_improve.map((pat, i) => (
                    <li key={i} className="text-xs text-slate-700 bg-blue-50/60 p-3 rounded-xl border border-blue-200/60 flex items-start gap-2 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{pat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions Needing Practice & Recommended Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Questions Needing Practice */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  Questions That Need Practice
                </h4>
                <ul className="space-y-2">
                  {(finalReport.report.questions_need_practice || []).map((q, i) => (
                    <li key={i} className="text-xs text-slate-700 bg-rose-50/60 p-3 rounded-xl border border-rose-200/60 flex items-start gap-2 font-medium">
                      <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>"{q}"</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Topics */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Recommended Topics to Revise
                </h4>
                <ul className="space-y-2">
                  {(finalReport.report.recommended_topics || []).map((top, idx) => (
                    <li key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[11px] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{top}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Save Status & Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {isSavedToHistory && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <Check className="w-4 h-4" />
                  Saved to Interview History
                </span>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => setActiveStage('setup')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Start New Interview
                </button>
                <button
                  onClick={() => setActiveStage('history')}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  View All Interview History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: INTERVIEW HISTORY & TRANSCRIPT REVIEW */}
        {activeStage === 'history' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Your Completed Interview Sessions</h3>
                <p className="text-slate-500 text-xs mt-0.5">Review past mock interviews, transcripts, and AI evaluations</p>
              </div>
              <button
                onClick={() => setActiveStage('setup')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                + New Practice Session
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading your interview history...
              </div>
            ) : interviewHistory.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">No Interview Sessions Saved Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Complete your first voice mock interview to receive detailed qualitative feedback and review Q&A transcripts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {interviewHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{rec.resume_filename}</h4>
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                            {rec.interview_type}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>Difficulty: <strong className="text-slate-800 capitalize">{rec.difficulty}</strong></span>
                          <span>•</span>
                          <span>{rec.total_questions} Questions</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(rec.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Feedback Ready
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedHistoryRecord(rec)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                      >
                        Review Transcript
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* HISTORICAL TRANSCRIPT MODAL DRAWER */}
            {selectedHistoryRecord && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">TRANSCRIPT REVIEW</span>
                      <h3 className="text-lg font-extrabold text-slate-900">{selectedHistoryRecord.resume_filename}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedHistoryRecord(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Transcript Items List */}
                  <div className="space-y-6">
                    {selectedHistoryRecord.transcript.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Question {idx + 1} ({item.category})</span>
                          <span className="text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Detailed AI Feedback
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900">"{item.question}"</p>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
                          <strong className="text-slate-900 block mb-1">Your Answer:</strong>
                          "{item.candidate_answer}"
                        </div>

                        <div className="text-xs space-y-2 text-slate-700">
                          {item.evaluation.what_was_done_well && item.evaluation.what_was_done_well.length > 0 && (
                            <p><strong className="text-emerald-700">✓ Done Well: </strong> {item.evaluation.what_was_done_well.join(' ')}</p>
                          )}
                          {item.evaluation.what_was_missing && item.evaluation.what_was_missing.length > 0 && (
                            <p><strong className="text-amber-700">⚠ Missing: </strong> {item.evaluation.what_was_missing.join(' ')}</p>
                          )}
                          {item.evaluation.what_could_improve && item.evaluation.what_could_improve.length > 0 && (
                            <p><strong className="text-indigo-700">🔧 Guidance: </strong> {item.evaluation.what_could_improve.join(' ')}</p>
                          )}
                          {(!item.evaluation.what_was_done_well || item.evaluation.what_was_done_well.length === 0) && item.evaluation.feedback?.done_well && (
                            <p><strong className="text-emerald-700">✓ Feedback: </strong> {item.evaluation.feedback.done_well}</p>
                          )}
                        </div>

                        {item.follow_up_question && (
                          <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
                            <strong className="block text-indigo-950">Adaptive Follow-Up Question:</strong>
                            <p>"{item.follow_up_question}"</p>
                            {item.follow_up_answer && (
                              <p className="text-slate-800 font-medium"><strong>Answer: </strong> "{item.follow_up_answer}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedHistoryRecord(null)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                    >
                      Close Transcript
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
