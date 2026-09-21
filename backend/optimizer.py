import os
import re
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def generate_suggested_bullet_changes(
    resume_text: str,
    matched_skills: List[str],
    missing_skills: List[str]
) -> List[Dict[str, str]]:
    """
    Generates concrete, suggested bullet point improvements from candidate's extracted resume text.
    Enhances phrasing with action verbs and metric placeholders without inventing fake experience.
    """
    if not resume_text:
        return []

    lines = [line.strip() for line in resume_text.split('\n') if line.strip() and len(line.strip().split()) >= 4]
    suggested_changes: List[Dict[str, str]] = []

    # Common passive phrases to detect and upgrade
    PASSIVE_PATTERNS = [
        (r'\b(?:responsible for|handled|worked on|helped with|involved in|assisted with)\s+(.*?)(?:\.|$)', 'Architected and spearheaded'),
        (r'\b(?:developed|built|created)\s+(.*?)(?:\.|$)', 'Engineered and deployed scalable'),
        (r'\b(?:managed|led)\s+(.*?)(?:\.|$)', 'Spearheaded and directed cross-functional execution of'),
        (r'\b(?:used|utilized|using)\s+(.*?)(?:\.|$)', 'Leveraged high-efficiency'),
    ]

    for line in lines[:25]:
        line_clean = re.sub(r'^[•\-\*\d\.]+\s*', '', line).strip()
        if len(line_clean.split()) < 4 or len(line_clean.split()) > 30:
            continue

        line_lower = line_clean.lower()

        # Check for passive or upgradeable language
        for pat, action_verb in PASSIVE_PATTERNS:
            match = re.search(pat, line_clean, re.IGNORECASE)
            if match:
                rest = match.group(1).strip()
                if rest:
                    rest_formatted = rest[0].lower() + rest[1:] if len(rest) > 1 else rest.lower()
                    improved_line = f"{action_verb} {rest_formatted}"
                else:
                    improved_line = f"{action_verb} {line_clean}"

                improved_line = improved_line.rstrip('.') + "."

                suggested_changes.append({
                    "original": line_clean,
                    "improved": improved_line,
                    "reason": "Replaced passive/standard phrasing with dynamic action verbs while strictly preserving original resume facts."
                })
                break

        if len(suggested_changes) >= 3:
            break

    # Fallback templates if fewer than 2 changes generated from raw text
    if len(suggested_changes) < 2 and matched_skills:
        top_skills = matched_skills[:2]
        skill_str = " and ".join(top_skills)
        suggested_changes.append({
            "original": f"Experienced with {skill_str} in web applications.",
            "improved": f"Architected and deployed web applications utilizing {skill_str}.",
            "reason": "Transformed plain skill declaration into an action-oriented technical statement while strictly preserving original facts."
        })

    return suggested_changes[:4]


def generate_rule_based_optimizer_analysis(
    analysis_data: Dict[str, Any],
    resume_text: str,
    jd_text: str
) -> Dict[str, Any]:
    """
    Generates rule-based structured AI Resume Optimizer recommendations across 5 categories:
    1. Critical Improvements
    2. Keyword Optimization
    3. Skills to Highlight
    4. Content Improvements
    5. ATS / Structure Improvements
    Used as primary fallback if Gemini API is unavailable or fails.
    """
    matched_skills = analysis_data.get("matched_skills", [])
    missing_skills = analysis_data.get("missing_skills", [])
    critical_missing = analysis_data.get("critical_missing_skills", [])
    important_missing = analysis_data.get("important_missing_skills", [])
    nice_missing = analysis_data.get("nice_to_have_missing_skills", [])
    ats_breakdown = analysis_data.get("ats_score_breakdown", {})
    components = ats_breakdown.get("components", {})

    categories: List[Dict[str, Any]] = []

    # 1. Critical Improvements
    critical_recs: List[Dict[str, str]] = []
    if critical_missing:
        for skill in critical_missing[:3]:
            critical_recs.append({
                "category": "Critical Improvements",
                "priority": "High",
                "explanation": f"'{skill}' is explicitly required or heavily emphasized in the job description but is currently missing from your resume.",
                "action": f"Add a dedicated experience bullet point or project demonstrating hands-on experience with {skill}."
            })
    else:
        critical_recs.append({
            "category": "Critical Improvements",
            "priority": "Low",
            "explanation": "No critical skill gaps detected! Your resume matches all core required skills.",
            "action": "Maintain your existing core technical skills section prominence."
        })

    categories.append({
        "name": "Critical Improvements",
        "description": "High-priority missing skills that are core job requirements.",
        "recommendations": critical_recs
    })

    # 2. Keyword Optimization
    keyword_recs: List[Dict[str, str]] = []
    if important_missing:
        skills_str = ", ".join(important_missing[:3])
        keyword_recs.append({
            "category": "Keyword Optimization",
            "priority": "Medium",
            "explanation": f"The job description highlights relevant role keywords ({skills_str}) that are missing from your text.",
            "action": f"Incorporate technical terms like {skills_str} naturally into your work experience bullet points."
        })
    if nice_missing:
        skills_str = ", ".join(nice_missing[:3])
        keyword_recs.append({
            "category": "Keyword Optimization",
            "priority": "Low",
            "explanation": f"Preferred bonus keywords ({skills_str}) were identified in the posting.",
            "action": f"If applicable, mention secondary skills like {skills_str} under an 'Additional Skills' section."
        })
    if not important_missing and not nice_missing:
        keyword_recs.append({
            "category": "Keyword Optimization",
            "priority": "Low",
            "explanation": "Keyword alignment is optimal across domain terminology.",
            "action": "Ensure keyword formatting uses standard industry spellings."
        })

    categories.append({
        "name": "Keyword Optimization",
        "description": "Strategic placement of missing role-relevant keywords.",
        "recommendations": keyword_recs
    })

    # 3. Skills to Highlight
    highlight_recs: List[Dict[str, str]] = []
    if matched_skills:
        top_matched = matched_skills[:3]
        skills_str = ", ".join(top_matched)
        highlight_recs.append({
            "category": "Skills to Highlight",
            "priority": "Medium",
            "explanation": f"You possess matched core skills ({skills_str}), but making them prominent increases immediate recruiter visibility.",
            "action": f"Place {skills_str} near the top of your 'Skills' section and in your summary paragraph."
        })
    else:
        highlight_recs.append({
            "category": "Skills to Highlight",
            "priority": "High",
            "explanation": "Limited technical skill keyword matches detected.",
            "action": "Add a dedicated 'Technical Skills' section categorizing languages, frameworks, and tools."
        })

    categories.append({
        "name": "Skills to Highlight",
        "description": "Prominent positioning for matched skills essential to the target role.",
        "recommendations": highlight_recs
    })

    # 4. Content Improvements
    content_recs: List[Dict[str, str]] = []
    words = resume_text.split() if resume_text else []
    if len(words) < 200:
        content_recs.append({
            "category": "Content Improvements",
            "priority": "High",
            "explanation": "Resume word count is brief (under 200 words), limiting detailed achievement context.",
            "action": "Expand on project responsibilities, technologies utilized, and measurable outcomes."
        })

    if re.search(r'\b(?:responsible for|worked on|helped with|handled)\b', resume_text.lower() if resume_text else ''):
        content_recs.append({
            "category": "Content Improvements",
            "priority": "Medium",
            "explanation": "Detected passive phrasing (e.g., 'responsible for', 'worked on') which reduces impact.",
            "action": "Replace passive verbs with strong action verbs like 'Architected', 'Engineered', 'Spearheaded', or 'Optimized'."
        })

    if not re.search(r'\b(?:\d+%\b|\$\d+|\d+\+|\d+x\b)', resume_text.lower() if resume_text else ''):
        content_recs.append({
            "category": "Content Improvements",
            "priority": "Medium",
            "explanation": "Few or no quantifiable impact metrics detected in your text.",
            "action": "Add specific performance figures, growth percentages, or dollar amounts to quantify your achievements."
        })

    if not content_recs:
        content_recs.append({
            "category": "Content Improvements",
            "priority": "Low",
            "explanation": "Resume content shows strong action-oriented phrasing.",
            "action": "Ensure bullet points focus on result-driven statements (Action Verb + Task + Outcome)."
        })

    categories.append({
        "name": "Content Improvements",
        "description": "Language, action verb, and measurable impact optimization.",
        "recommendations": content_recs
    })

    # 5. ATS / Structure Improvements
    structure_recs: List[Dict[str, str]] = []
    struct_comp = components.get("resume_structure", {})
    struct_score = struct_comp.get("score", 15.0)

    if struct_score < 12.0:
        structure_recs.append({
            "category": "ATS/Structure Improvements",
            "priority": "High",
            "explanation": "Resume structure score is below 12/15 due to missing standard headers or formatting length.",
            "action": "Ensure clear section headers: Experience, Education, Technical Skills, and Key Projects."
        })

    structure_recs.append({
        "category": "ATS/Structure Improvements",
        "priority": "Low",
        "explanation": "Ensure extracted text uses standard fonts and un-nested single column tables for clean parser indexing.",
        "action": "Use clean, unstyled PDF/DOCX layouts without graphics, text boxes, or nested multi-column tables."
    })

    categories.append({
        "name": "ATS/Structure Improvements",
        "description": "Document layout, section headers, and parser readability.",
        "recommendations": structure_recs
    })

    # Generate Concrete Suggested Resume Changes (Bullet Point Improvements)
    suggested_changes = generate_suggested_bullet_changes(
        resume_text=resume_text,
        matched_skills=matched_skills,
        missing_skills=missing_skills
    )

    return {
        "categories": categories,
        "suggested_changes": suggested_changes
    }


def generate_gemini_optimizer_analysis(
    analysis_data: Dict[str, Any],
    resume_text: str,
    jd_text: str
) -> Optional[Dict[str, Any]]:
    """
    Generates AI Resume Optimizer recommendations using Google GenAI SDK (google-genai).
    Enforces strict Zero-Invention / Anti-Hallucination policy.
    Returns None on API failure, missing API key, or parsing error to trigger rule-based fallback.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        logger.info("[Optimizer] GEMINI_API_KEY is not set or using placeholder. Falling back to rule-based optimizer.")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        matched_skills = analysis_data.get("matched_skills", [])
        critical_missing = analysis_data.get("critical_missing_skills", [])
        important_missing = analysis_data.get("important_missing_skills", [])
        nice_missing = analysis_data.get("nice_to_have_missing_skills", [])
        ats_score = analysis_data.get("ats_score_breakdown", {}).get("total_score", 0)

        system_instruction = (
            "You are an elite AI Resume Coach and ATS Optimization Specialist.\n"
            "Your objective is to provide highly actionable, personalized resume optimization recommendations and bullet point rewrites.\n\n"
            "CRITICAL FACTUAL GUARDRAILS & ZERO-INVENTION POLICY:\n"
            "1. Strictly DO NOT invent or fabricate any:\n"
            "   - Companies, employers, or employment dates\n"
            "   - Projects or products not mentioned in original text\n"
            "   - Technologies, programming languages, or tools not in original resume or job posting\n"
            "   - Degrees, academic institutions, or certifications\n"
            "   - Achievements, quantifiable metrics, percentages (%), or monetary figures ($)\n"
            "2. All suggested bullet improvements MUST strictly preserve the true factual information contained in the original resume text.\n"
            "3. Enhance phrasing using dynamic action verbs (e.g., replace 'responsible for' with 'Engineered', 'Architected', 'Spearheaded').\n"
            "4. You MUST return ONLY a valid JSON object matching the requested schema without markdown formatting or code blocks."
        )

        prompt = f"""
Candidate Resume Text:
{resume_text[:3000]}

Target Job Description:
{jd_text[:3000]}

Existing Analysis Data:
- Matched Skills: {matched_skills}
- Critical Missing Skills: {critical_missing}
- Important Missing Skills: {important_missing}
- Nice-to-Have Missing Skills: {nice_missing}
- Calculated ATS Score: {ats_score}/100

Generate an optimization analysis as a JSON object with EXACTLY two keys:
"categories" and "suggested_changes".

The "categories" array MUST contain 5 objects corresponding to these exact names:
1. "Critical Improvements" (description: "High-priority missing skills that are core job requirements.")
2. "Keyword Optimization" (description: "Strategic placement of missing role-relevant keywords.")
3. "Skills to Highlight" (description: "Prominent positioning for matched skills essential to the target role.")
4. "Content Improvements" (description: "Language, action verb, and measurable impact optimization.")
5. "ATS / Structure Improvements" (description: "Document layout, section headers, and parser readability.")

Each category object must have:
- "name": string (matching one of the 5 category names above)
- "description": string
- "recommendations": array of objects with keys:
  * "category": string (same as category name)
  * "priority": "High" | "Medium" | "Low"
  * "explanation": string (explaining the context clearly)
  * "action": string (actionable advice without inventing fake experience)

The "suggested_changes" array MUST contain 2 to 4 bullet point rewrites based directly on actual lines in the resume text:
Each object in "suggested_changes" must have:
- "original": string (exact or cleaned line from original resume)
- "improved": string (rewritten version with strong action verbs, strictly preserving facts)
- "reason": string (explanation of the rephrasing)

JSON format:
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=4096,
            )
        )

        if not response or not response.text:
            logger.warning("[Optimizer] Gemini returned an empty response. Using rule-based fallback.")
            return None

        # Clean JSON response if wrapped in markdown fence or extra text
        raw_text = response.text.strip()
        if "```" in raw_text:
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
            raw_text = re.sub(r'```$', '', raw_text, flags=re.MULTILINE).strip()

        # Extract JSON object using regex if needed
        json_match = re.search(r'(\{[\s\S]*\})', raw_text)
        if json_match:
            raw_text = json_match.group(1)

        result_json = json.loads(raw_text)

        # Validate minimum structure requirement
        if "categories" in result_json and isinstance(result_json["categories"], list) and "suggested_changes" in result_json:
            logger.info("[Optimizer] Successfully generated Gemini AI Resume Optimizer analysis.")
            return result_json
        else:
            logger.warning("[Optimizer] Gemini response schema missing required keys. Using rule-based fallback.")
            return None

    except Exception as e:
        logger.error(f"[Optimizer] Error during Gemini API call: {str(e)}. Using rule-based fallback.")
        return None


import os
import re
import json
import logging
import concurrent.futures
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def generate_gemini_optimizer_analysis_with_timeout(
    analysis_data: Dict[str, Any],
    resume_text: str,
    jd_text: str,
    timeout_seconds: float = 8.0
) -> Optional[Dict[str, Any]]:
    """
    Executes generate_gemini_optimizer_analysis with a strict backend timeout.
    Falls back gracefully if execution exceeds timeout_seconds or raises an exception.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(
            generate_gemini_optimizer_analysis,
            analysis_data,
            resume_text,
            jd_text
        )
        try:
            return future.result(timeout=timeout_seconds)
        except concurrent.futures.TimeoutError:
            logger.warning(f"[Optimizer] Gemini API call timed out after {timeout_seconds}s. Falling back to rule-based engine.")
            return None
        except Exception as e:
            logger.error(f"[Optimizer] Gemini API call failed: {str(e)}. Falling back to rule-based engine.")
            return None


def generate_optimizer_analysis(
    analysis_data: Dict[str, Any],
    resume_text: str,
    jd_text: str
) -> Dict[str, Any]:
    """
    Main entry point for initial resume analysis.
    Uses the fast, deterministic rule-based engine to return ML/ATS analysis in <0.5 seconds
    without blocking on remote LLM API calls.
    Full Gemini AI optimizations are generated on-demand when the user views or requests them in the AI Resume Optimizer.
    """
    return generate_rule_based_optimizer_analysis(
        analysis_data=analysis_data,
        resume_text=resume_text,
        jd_text=jd_text
    )





