export type InterviewType = 'technical' | 'behavioral' | 'project' | 'mixed';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionCount = 5 | 10 | 15;

export type VoiceAudioState = 'idle' | 'granting_permission' | 'ready' | 'listening' | 'paused' | 'error' | 'unsupported';
export type TTSPlaybackState = 'idle' | 'speaking' | 'paused';

export interface InterviewSetupOptions {
  analysisId: string;
  resumeFilename: string;
  rawResumeText: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  numQuestions: QuestionCount;
}

export interface QuestionItem {
  id: number;
  question: string;
  category: string;
  target_topic?: string;
}

export interface AnswerScores {
  relevance?: number;
  technical_accuracy?: number;
  completeness?: number;
  clarity?: number;
  communication?: number;
}

export interface AnswerFeedback {
  done_well: string;
  missing: string;
  incorrect?: string;
  irrelevant?: string;
  could_improve: string;
  better_answer_example: string;
  strong_answer_example?: string;
}

export interface AnswerEvaluation {
  question_intent?: string;
  expected_points?: string[];
  addressed_points?: string[];
  missing_points?: string[];
  incorrect_points?: string[];
  irrelevant_content?: string[];
  what_was_done_well: string[];
  what_was_missing: string[];
  what_was_incorrect: string[];
  what_was_irrelevant: string[];
  what_could_improve: string[];
  better_answer_guidance: string[];
  strong_answer_example?: string;
  feedback: AnswerFeedback;
  needs_follow_up: boolean;
  follow_up_question?: string | null;
  // Legacy optional fields for backwards compatibility with old history
  scores?: AnswerScores;
  overall_score?: number;
}

export interface TranscriptItem {
  id: number;
  question: string;
  category: string;
  candidate_answer: string;
  evaluation: AnswerEvaluation;
  follow_up_question?: string | null;
  follow_up_answer?: string | null;
  follow_up_evaluation?: AnswerEvaluation | null;
}

export interface PerformanceScores {
  overall?: number;
  technical_knowledge?: number;
  project_understanding?: number;
  communication?: number;
  problem_solving?: number;
  resume_knowledge?: number;
}

export interface PerformanceReport {
  overall_feedback: string;
  report: {
    strong_areas: string[];
    areas_to_improve: string[];
    questions_need_practice: string[];
    recommended_topics: string[];
    answering_patterns_to_improve: string[];
  };
  // Optional legacy fields for old history compatibility
  overall_score?: number;
  performance_scores?: PerformanceScores;
}

export interface InterviewHistoryRecord {
  id: string;
  user_id: string;
  analysis_id?: string;
  resume_filename: string;
  interview_type: string;
  difficulty: string;
  total_questions: number;
  report: {
    strong_areas: string[];
    areas_to_improve: string[];
    questions_need_practice: string[];
    recommended_topics: string[];
    answering_patterns_to_improve?: string[];
  };
  transcript: TranscriptItem[];
  created_at: string;
  overall_score?: number;
  performance_scores?: PerformanceScores;
}
