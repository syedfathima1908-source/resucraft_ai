ResuCraft AI 🚀
An AI-Powered Resume Analysis, Optimization, Personalization & Voice-Based Mock Interview Platform

📌 Overview
ResuCraft AI is a full-stack, enterprise-grade career preparation platform designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS) and excel in technical and behavioral job interviews.

By combining deterministic Machine Learning algorithms (TF-IDF vectorization, cosine similarity, section structure scoring) with state-of-the-art Large Language Models (Google Gemini 2.5 Flash), ResuCraft AI provides instantaneous, explainable ATS match breakdown scores, zero-invention resume bullet point rewrites, and an interactive Voice-Based AI Mock Interview Simulator grounded directly in candidate resume data.

💡 Problem Statement
In today's modern hiring ecosystem, over 75% of job applications are filtered out by automated Applicant Tracking Systems (ATS) before reaching human recruiters. Candidates struggle with three primary challenges:

Opaque ATS Filtering: Candidates lack clear, explainable feedback on why their resume was rejected or how keyword matching and similarity scores are calculated.
Generic Resume Formatting: Standard resumes fail to highlight critical job-description-specific skills or use high-impact action verbs.
Interview Anxiety & Lack of Practice: Traditional mock interviews are expensive, hard to schedule, and rarely tailored to a candidate's actual projects or technical stack.
✨ Solution
ResuCraft AI addresses these challenges by offering an all-in-one AI career suite:

Instant ML/ATS Analysis: Upload PDF/DOCX resumes alongside target job descriptions to receive a 100-point explainable ATS score breakdown, matched skills, and prioritized missing skills.
AI-Powered Resume Optimization: Receive targeted recommendations and bullet point rewrites powered by Gemini 2.5 Flash, strictly enforcing a zero-invention anti-hallucination policy.
Voice-Enabled AI Mock Interviewer: Practice live voice-driven mock interviews with speech-to-text input, voice playback, candidate project grounding, and question-by-question qualitative feedback.
Complete Application History: Securely store analysis records and interview performance reports backed by Supabase Row Level Security (RLS).
🎯 Key Features
Document Parsing: Native text extraction for both .pdf (PyPDF) and .docx (python-docx) files.
4-Component Explainable ATS Score: Deterministic breakdown across Keyword Match (35 pts), TF-IDF Similarity (30 pts), Skill Coverage (20 pts), and Resume Structure (15 pts).
Deterministic Skill Gap Categorization: Automatically groups missing skills into Critical, Important, and Nice-to-Have tiers based on job description context.
Zero-Invention Resume Optimizer: Suggests action-oriented bullet point improvements without fabricating experience, metrics, or technologies.
Voice-Activated Mock Interview: Real-time voice interaction using the Web Speech API (SpeechRecognition + SpeechSynthesis) with push-to-talk controls.
Resume-Grounded Project Deep-Dive: Extracts candidate project names and technical evidence from resumes to ask highly realistic, project-specific technical questions.
Qualitative AI Feedback Engine: Detailed coaching feedback for every answer without arbitrary numerical grading, concluding with a comprehensive Final Performance Report Card.
Secure Authentication & Cloud Storage: Managed authentication and user data isolation via Supabase RLS.
🔍 Feature-by-Feature Explanation
1. AI Resume Analyzer
Upload your resume in PDF or DOCX format and paste a target job description. The analyzer extracts raw text, normalizes content using NLTK (lowercasing, stopword filtering, lemmatization), and scans against a comprehensive technical skill taxonomy covering 50+ programming languages, frameworks, cloud services, and AI tools.

2. ATS Analysis
Unlike black-box ATS tools, ResuCraft AI calculates a transparent, 100-point score composed of four explainable components:

Keyword & Skill Match (35 pts max): Weighted score evaluating candidate skills against role requirements.
TF-IDF Vector Similarity (30 pts max): Scikit-learn TF-IDF vectorization and cosine similarity measuring vocabulary alignment.
Skill Coverage Ratio (20 pts max): Percentage of unique job description skills detected in the candidate's resume.
Resume Content & Structure (15 pts max): Evaluates optimal word count (250–850 words), standard section headers (Experience, Education, Skills, Projects, Summary), and quantifiable impact metrics (%, $, +).
3. Skill Gap / Missing Skills Analysis
Missing skills detected in the job description are automatically categorized into three exclusive priority levels:

🔴 Critical Improvements: Mandatory core skills explicitly required in job description headers or repeated multiple times.
🟡 Important Optimization: Relevant domain terminology and secondary technical skills.
🟢 Nice-to-Have Bonus: Preferred skills that give candidates an extra edge.
4. AI Resume Optimizer
Generates actionable recommendations across 5 structured categories:

Critical Improvements
Keyword Optimization
Skills to Highlight
Content Improvements
ATS / Structure Improvements
Includes concrete, line-by-line suggested bullet point improvements that upgrade passive phrasing (e.g., "worked on", "responsible for") into dynamic technical statements (e.g., "Architected and deployed"). Powered on-demand by Gemini 2.5 Flash with automatic fallback to a rule-based engine.

5. Resume Personalization
Enables candidates to tailor their application for specific job descriptions by matching target role terminology, highlighting existing relevant experience, and identifying exact keyword gaps.

6. Voice AI Mock Interview
An interactive mock interview interface featuring:

Push-to-Talk Voice Input: Speak your answers naturally using browser Speech Recognition.
Text-to-Speech Playback: Listen to the AI interviewer speak each question.
Live Transcription: Instant transcription of candidate speech with editable text fallback.
Customizable Sessions: Select interview types (Project Deep-Dive, Technical, Behavioral / HR, Mixed), difficulty levels (Easy, Medium, Hard), and question counts (3 to 10 questions).
7. Resume-Grounded Project Deep-Dive
Extracts actual candidate project names and technical tools (e.g., ESP32, Firebase, React, PostgreSQL) directly from the uploaded resume. Questions explicitly reference the candidate's project names, preventing generic placeholders like "Project X" or "your main project".

8. Qualitative AI Interview Feedback
Evaluates candidate answers per question like a human engineering manager:

What Was Done Well: Acknowledges correctly answered technical dimensions.
What Was Missed: Identifies unaddressed question requirements.
What Was Incorrect: Highlights genuine technical errors (e.g., confusing inheritance with encapsulation).
What Was Irrelevant: Identifies off-topic content.
Actionable Guidance & Stronger Answer Examples: Provides question-specific guidance and neutral example answers.
Generates a Final Performance Report Card summarizing strong areas, areas to improve, questions needing practice, and recommended study topics.

🛠️ Technology Stack
Frontend
Framework: React 19 + TypeScript + Vite
Styling: Tailwind CSS v4 + Lucide React Icons
Routing: React Router v7
Authentication & Database Client: @supabase/supabase-js
Voice Capabilities: Web Speech API (SpeechRecognition / webkitSpeechRecognition, SpeechSynthesis)
Backend
Framework: Python 3.10+ with Flask 3.1 & Flask-CORS
Document Processing: PyPDF 5.3, python-docx 1.1
NLP & Machine Learning: NLTK 3.9 (stopwords, lemmatizer), Scikit-Learn (TF-IDF Vectorizer, Cosine Similarity), NumPy
AI Model Integration: Google GenAI SDK (google-genai using gemini-2.5-flash)
Environment Management: python-dotenv
Database & Security
Platform: Supabase (PostgreSQL)
Security: Row Level Security (RLS) policies isolating user data
🏗️ System Architecture

🔄 Application Workflow

📁 Project Structure
resucraft-ai/
├── backend/
│   ├── app.py                   # Flask REST API routes (/api/analyze, /api/optimize-full, /api/interview/*)
│   ├── analyzer.py              # Text extraction, NLTK preprocessing, skill taxonomy, TF-IDF ATS scoring
│   ├── optimizer.py             # Rule-based fallback & Gemini 2.5 Flash resume optimizer engine
│   ├── interview.py             # Project extraction, grounded question generator, qualitative evaluator & report engine
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Backend environment template
│   └── storage/
│       └── uploads/             # Temporary document processing storage
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, Hero, Features, ProtectedRoute, etc.)
│   │   ├── context/             # AuthContext for Supabase authentication state
│   │   ├── lib/                 # Supabase client instance & API services
│   │   └── pages/               # Application pages (LandingPage, Login, Signup, Dashboard, AnalyzeResume, Optimizer, MockInterview, AnalysisHistory)
│   ├── package.json             # Frontend NPM scripts and dependencies
│   ├── vite.config.ts           # Vite build configuration
│   └── .env.example             # Frontend environment template
├── supabase/
│   └── migrations/              # PostgreSQL schema migrations & RLS security policies
│       ├── 20260918_analysis_history.sql
│       ├── 20260920_add_raw_resume_text.sql
│       └── 20260920_interview_history.sql
└── README.md                    # Project documentation
⚡ Installation and Setup
Prerequisites
Node.js: v18.0.0 or higher
Python: v3.10 or higher
Git: Installed on your system
Google Gemini API Key: Obtained from Google AI Studio
Supabase Account: Created project on Supabase
🔑 Environment Variables
⚠️ IMPORTANT: Never commit actual secret keys or API credentials to version control.

Create .env files in both the backend/ and frontend/ directories using the placeholders below:

Backend .env (backend/.env)
# Backend environment configuration
FLASK_ENV=development

# Google Gemini API Key for AI Resume Optimization & Mock Interview Evaluation
GEMINI_API_KEY=your_gemini_api_key_here
Frontend .env (frontend/.env)
# Supabase Configuration for Frontend Auth & Database Sync
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
🖥️ Running the Backend
Navigate to the backend/ directory:

cd backend
Create and activate a Python virtual environment:

Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1
Linux / macOS:
python3 -m venv venv
source venv/bin/activate
Install required Python packages:

pip install -r requirements.txt
Start the Flask server:

python app.py
The backend server will start on http://localhost:5000.

💻 Running the Frontend
Open a new terminal and navigate to the frontend/ directory:

cd frontend
Install Node dependencies:

npm install
Start the Vite development server:

npm run dev
Open your browser at http://localhost:5173.

🗄️ Database / Supabase Setup
Log into your Supabase Dashboard and navigate to the SQL Editor.
Run the migration scripts in sequential order from supabase/migrations/:
20260918_analysis_history.sql (Creates analysis_history table & RLS policies)
20260920_add_raw_resume_text.sql (Adds raw_resume_text column)
20260920_interview_history.sql (Creates interview_history table & RLS policies)
Ensure Email Auth is enabled under Authentication Settings.
🧪 Testing
The codebase includes test scripts in scratch/ covering key functional modules:

Document Parsing & Skill Extraction:
python scratch/test_scoring.py
Gemini API Integration & Diagnostic:
python scratch/test_gemini_integration.py
Interview Question Grounding & Evaluation:
python scratch/test_interview_api.py
📸 Screenshots
(Placeholders where application screenshots can be added)

Feature	Screenshot
Landing Page	![Landing Page](https://via.placeholder.com/800x450?text=ResuCraft+AI+Landing+Page)
AI Resume Analyzer	![Resume Analyzer](https://via.placeholder.com/800x450?text=Resume+Analyzer+and+ATS+Score)
AI Resume Optimizer	![Resume Optimizer](https://via.placeholder.com/800x450?text=AI+Resume+Optimizer+Recommendations)
Voice Mock Interview	![Mock Interview](https://via.placeholder.com/800x450?text=Voice+AI+Mock+Interview+Simulator)
Performance Report	![Performance Report](https://via.placeholder.com/800x450?text=Qualitative+Interview+Report+Card)
🚀 Future Enhancements
Multi-Language Support: Extend ATS analysis and interview generation to non-English resumes.
Exportable Optimized Resumes: One-click download of optimized resumes in formatted PDF and DOCX templates.
Video AI Interviewer: Video emotion and facial engagement analysis during mock interviews.
Custom Question Bank Creation: Allow recruiters or mentors to upload custom question sets for target company preparation.
🛡️ Security Notes
Secret Protection: All secret keys and environment variables are excluded from Git via .gitignore.
Row Level Security (RLS): Database tables in Supabase use RLS policies ensuring users can read, write, and delete only their own data.
Zero-Invention Anti-Hallucination Policy: AI prompts explicitly prohibit inventing fake employers, dates, metrics, or candidate qualifications.
File Upload Protection: Uploaded resume files are parsed in memory and temporary file handles are cleaned up immediately.
👤 Author
Developed by Syed Fathima for ResuCraft AI.

GitHub: github.com/SyedFathima
Project Repository: ResuCraft AI
About

AI-powered Resume Analyzer and Voice Mock Interview Platform

Resources
Readme
Activity
Stars
1 star
Watchers
0 watching
Forks
0 forks
Releases
No releases published
Create a new release
Packages
No packages published
Publish your first package
Contributors
1
 (1)
@syedfathima1908-source
syedfathima1908-source
Languages
TypeScript
69.3%
Python
29.9%
Other
0.8%
Suggested workflows
Based on your tech stack

Deno logo
Deno
Test your Deno project
By GitHub Actions
Publish Python Package logo
Publish Python Package
Publish a Python Package to PyPI on release.
By GitHub Actions
Datadog Synthetics logo
Datadog Synthetics
Run Datadog Synthetic tests within your GitHub Actions workflow
By D
