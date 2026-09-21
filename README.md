# ResuCraft AI 🚀

### AI-Powered Resume Analysis, Optimization & Voice Mock Interview Platform

ResuCraft AI is a full-stack AI career preparation platform that helps candidates analyze their resumes against job descriptions, identify skill gaps, improve resume content, and practice realistic voice-based interviews using their actual resume and project information.

The platform combines deterministic NLP and Machine Learning techniques with Google Gemini to provide explainable resume analysis, grounded AI recommendations, and personalized interview practice.

---

## 📌 Overview

Job seekers often face two major challenges:

- Understanding whether their resume matches a particular job description.
- Preparing for interviews based on their actual skills and projects.

ResuCraft AI brings both workflows into a single platform.

Users can:

1. Upload a resume.
2. Analyze it against a target job description.
3. Receive an explainable ATS-style analysis.
4. Identify missing and important skills.
5. Improve resume content using AI-assisted recommendations.
6. Practice voice-based mock interviews.
7. Answer questions using their microphone.
8. Receive detailed qualitative feedback on every answer.
9. Practice project-specific technical questions based directly on their resume.
10. Review their previous analyses and interview sessions.

---

# ✨ Key Features

## 1. 📄 AI Resume Analyzer

Upload a resume in:

- PDF
- DOCX

The system extracts the resume content and analyzes it against a provided job description.

The analyzer performs:

- Resume text extraction
- Text preprocessing
- Skill extraction
- Keyword analysis
- TF-IDF vectorization
- Cosine similarity
- Skill coverage analysis
- Resume structure analysis
- Missing skill identification
- Recommendation generation

---

## 2. 🎯 Explainable ATS Analysis

Instead of displaying only a single score, ResuCraft AI breaks the ATS analysis into understandable components.

### ATS Score Breakdown

| Component | Weight |
|---|---:|
| Keyword & Skill Match | 35 |
| TF-IDF Similarity | 30 |
| Skill Coverage | 20 |
| Resume Structure | 15 |
| **Total** | **100** |

### Keyword & Skill Match

Measures how closely the candidate's skills match the requirements in the job description.

### TF-IDF Similarity

Uses TF-IDF vectorization and cosine similarity to measure textual similarity between the resume and job description.

### Skill Coverage

Measures how many relevant skills from the job description are present in the resume.

### Resume Structure

Checks factors such as:

- Resume length
- Standard sections
- Skills section
- Projects
- Education
- Experience
- Quantifiable information

---

# 3. 🔍 Skill Gap Analysis

ResuCraft AI identifies skills that appear in the job description but are missing from the resume.

Missing skills are categorized into:

### 🔴 Critical

Important skills that are strongly emphasized or repeatedly required.

### 🟡 Important

Relevant technical or domain skills that can improve job alignment.

### 🟢 Nice to Have

Additional skills that can provide value but are not core requirements.

This helps candidates understand what they may need to learn or highlight.

---

# 4. 🤖 AI Resume Optimizer

The Resume Optimizer provides actionable suggestions for improving resume content.

It focuses on areas such as:

- Critical improvements
- Keyword optimization
- Skills to highlight
- Content improvements
- ATS structure improvements
- Resume bullet improvements

The optimizer can use Google Gemini for AI-powered suggestions while maintaining a strict:

### Zero-Invention Policy

The system should not invent:

- Companies
- Job titles
- Technologies
- Projects
- Certifications
- Achievements
- Metrics
- Experience
- Qualifications

Recommendations are grounded in the information already present in the candidate's resume.

A deterministic rule-based fallback is also available when the AI service is unavailable.

---

# 5. 🎤 Voice AI Mock Interview

ResuCraft AI includes an interactive voice-based mock interview simulator.

The interviewer asks questions using text-to-speech, while candidates can answer using their microphone.

### Voice Features

- 🎙️ Speech-to-text
- 🔊 Text-to-speech
- 📝 Live transcription
- ✏️ Editable transcript
- 🔄 Re-record answer
- ▶️ Replay question
- ⏯️ Voice playback controls
- ⌨️ Text fallback when voice input is unavailable

The browser Web Speech API is used for speech recognition and speech synthesis.

---

# 6. 🧑‍💻 Multiple Interview Types

Candidates can configure their interview session according to their preparation needs.

### Technical

Focuses on:

- Programming
- Frameworks
- Databases
- AI/ML
- Software development
- Technical concepts

### HR / Behavioral

Focuses on:

- Communication
- Situational questions
- Behavioral questions
- Experiences
- Decision-making
- Teamwork

### Project Deep-Dive

Focuses specifically on the candidate's projects.

### Mixed

Combines multiple interview styles.

Candidates can also select different difficulty levels and configure the number of questions.

---

# 7. 🧠 Resume-Grounded Project Deep-Dive

One of the key features of ResuCraft AI is resume-grounded project questioning.

Instead of asking generic questions such as:

> "Tell me about your main project."

the system extracts actual project information from the candidate's resume.

For example, if the resume contains:

- Project name
- Technologies
- Architecture
- Features
- Implementation details

the interviewer can generate questions specifically related to that project.

### Grounding Rules

The interview system is designed to avoid inventing:

- Projects
- Technologies
- Companies
- Frameworks
- Features
- Achievements

Questions should be based on information available in the candidate's resume.

This makes the interview experience more relevant to the candidate's actual background.

---

# 8. 💬 Qualitative AI Interview Feedback

ResuCraft AI does not rely on arbitrary numerical scores for individual answers.

Instead, the system provides detailed question-specific feedback.

For every answer, the candidate can receive:

### ✅ What Was Done Well

Identifies concepts and parts of the question that were answered correctly.

### ⚠️ What Was Missed

Identifies important parts of the question that were not addressed.

### ❌ What Was Incorrect

Highlights genuine technical or factual mistakes when present.

### 🚫 What Was Irrelevant

Identifies content that does not answer the question.

### 📈 What Could Improve

Provides specific suggestions for improving the answer.

### 🧩 How to Structure a Better Answer

Provides a logical structure that can be followed when answering similar questions.

### 💡 Stronger Answer Example

Provides a grounded example of how the answer could be improved without inventing candidate experience.

---

# 9. 📊 Final Interview Report

After completing an interview, ResuCraft AI generates a qualitative performance report.

The report can include:

- Overall feedback
- Strong areas
- Areas to improve
- Questions requiring more practice
- Recommended study topics
- Answering patterns to improve

The purpose is to help candidates understand **how to improve**, rather than simply assigning a number.

---

# 10. 📚 Analysis & Interview History

The application stores authenticated user activity using Supabase.

Users can review previous:

- Resume analyses
- ATS results
- Matched skills
- Missing skills
- Recommendations
- Interview sessions
- Interview transcripts
- Interview feedback
- Final reports

Each user's records are isolated using Supabase Row Level Security.

---

# 🔐 Authentication & Security

ResuCraft AI uses Supabase Authentication for user accounts.

Security features include:

- User authentication
- Protected application routes
- Supabase Row Level Security
- User-specific analysis history
- User-specific interview history
- Environment variables for secrets
- Backend-only Gemini API key
- `.env` excluded from Git
- `.env.example` provided for configuration

### Important

Never commit:

```text
.env
API keys
Supabase service-role keys
Passwords
Access tokens
Credentials
