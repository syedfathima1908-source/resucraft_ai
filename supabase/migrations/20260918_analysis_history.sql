-- Migration: Create analysis_history table with Row Level Security (RLS)
-- Description: Stores resume analysis results per user with RLS security policies.

CREATE TABLE IF NOT EXISTS public.analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_filename TEXT NOT NULL,
    match_percentage NUMERIC NOT NULL,
    matched_skills JSONB DEFAULT '[]'::jsonb,
    missing_skills JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    resume_skills JSONB DEFAULT '[]'::jsonb,
    job_description_skills JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert their own analysis records
CREATE POLICY "Users can insert their own analysis records"
ON public.analysis_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Authenticated users can select only their own analysis records
CREATE POLICY "Users can view their own analysis records"
ON public.analysis_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 3: Authenticated users can delete their own analysis records
CREATE POLICY "Users can delete their own analysis records"
ON public.analysis_history
FOR DELETE
USING (auth.uid() = user_id);
