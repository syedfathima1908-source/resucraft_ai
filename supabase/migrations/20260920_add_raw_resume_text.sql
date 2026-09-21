-- Migration: Add raw_resume_text column to public.analysis_history
-- Description: Stores extracted plain resume text for project-grounded interview question generation. Protected by existing RLS policies.

ALTER TABLE public.analysis_history
ADD COLUMN IF NOT EXISTS raw_resume_text TEXT;
