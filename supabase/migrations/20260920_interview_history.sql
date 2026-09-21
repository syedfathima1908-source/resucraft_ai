-- Migration: Create interview_history table with Row Level Security (RLS)
-- Description: Stores completed AI mock interviews, performance scores, transcripts, and reports per user.

CREATE TABLE IF NOT EXISTS public.interview_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES public.analysis_history(id) ON DELETE SET NULL,
    resume_filename TEXT NOT NULL,
    interview_type TEXT NOT NULL, -- 'technical', 'behavioral', 'project', 'mixed'
    difficulty TEXT NOT NULL,     -- 'easy', 'medium', 'hard'
    total_questions INTEGER NOT NULL,
    overall_score NUMERIC NOT NULL,
    performance_scores JSONB NOT NULL,
    report JSONB NOT NULL,
    transcript JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.interview_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert their own interview records
CREATE POLICY "Users can insert their own interview records"
ON public.interview_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Authenticated users can select only their own interview records
CREATE POLICY "Users can view their own interview records"
ON public.interview_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 3: Authenticated users can delete their own interview records
CREATE POLICY "Users can delete their own interview records"
ON public.interview_history
FOR DELETE
USING (auth.uid() = user_id);

-- Optional column for storing analyzed raw text securely in analysis_history for candidate grounding
ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS raw_resume_text TEXT;
