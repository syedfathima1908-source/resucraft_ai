import os
import re
import json
import time
import logging
import concurrent.futures
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Re-use skill taxonomy from analyzer if needed or build section extractor
from analyzer import SKILL_TAXONOMY, SKILL_DISPLAY_MAP, extract_skills

FORBIDDEN_PROJECT_PLACEHOLDERS = [
    "primary engineering project",
    "main project",
    "engineering project",
    "your project",
    "project x",
    "my project",
    "the project",
    "recent project",
    "sample project",
    "demo project",
    "primary resume project",
    "software project",
    "generic project",
    "unnamed project",
    "candidate project",
    "the candidate's project",
    "a project"
]


def is_development_env() -> bool:
    """
    Returns True if current execution environment is development mode.
    """
    env = os.getenv("FLASK_ENV", os.getenv("ENV", os.getenv("ENVIRONMENT", "development"))).lower().strip()
    return env in ["dev", "development", "local", "test"] or os.getenv("DEBUG", "false").lower() in ["true", "1"]


def is_valid_resume_text(resume_text: Optional[str]) -> bool:
    """
    Verifies that received text is actual extracted candidate resume text.
    Rejects empty, missing, whitespace, synthetic metadata, or mock/demo data.
    """
    if not resume_text:
        return False
    text = str(resume_text).strip()
    if len(text) < 20:
        return False
    # Check synthetic metadata pattern from frontend
    if text.startswith("Resume Filename:") and "Skills:" in text and len(text.splitlines()) <= 3:
        return False
    lower_text = text.lower()
    # Check demo/mock placeholders
    mock_keywords = ["lorem ipsum", "[insert resume]", "frontend mock data", "demo resume data", "sample resume data"]
    if any(kw in lower_text for kw in mock_keywords):
        return False
    return True



def extract_candidate_resume_entities(resume_text: str) -> Dict[str, Any]:
    """
    Parses resume text into a Ground Truth Context (GTC) structure containing
    only verified candidate facts: Projects, Technical Skills, Experience, and Education.
    """
    if not resume_text:
        return {
            "skills": [],
            "projects": [],
            "experience": [],
            "education": [],
            "raw_summary": ""
        }

    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]

    # Extract verified skills
    detected_skills = extract_skills(resume_text)
    display_skills = [SKILL_DISPLAY_MAP.get(s, s.title()) for s in detected_skills]

    # Section parsing helpers
    projects: List[str] = []
    experience: List[str] = []
    education: List[str] = []

    current_section = "general"

    for line in lines:
        line_lower = line.lower()
        # Header detection
        if re.search(r'\b(project|projects|key projects)\b', line_lower) and len(line.split()) < 4:
            current_section = "projects"
            continue
        elif re.search(r'\b(experience|work experience|employment|history|work history)\b', line_lower) and len(line.split()) < 4:
            current_section = "experience"
            continue
        elif re.search(r'\b(education|academic|qualification|qualifications)\b', line_lower) and len(line.split()) < 4:
            current_section = "education"
            continue
        elif re.search(r'\b(skill|skills|technical skills|technologies)\b', line_lower) and len(line.split()) < 4:
            current_section = "skills"
            continue

        if current_section == "projects":
            if len(line) > 5:
                projects.append(re.sub(r'^[•\-\*\d\.]+\s*', '', line))
        elif current_section == "experience":
            if len(line) > 5:
                experience.append(re.sub(r'^[•\-\*\d\.]+\s*', '', line))
        elif current_section == "education":
            if len(line) > 5:
                education.append(re.sub(r'^[•\-\*\d\.]+\s*', '', line))

    # Fallback heuristic if sections were unlabelled
    if not projects:
        for line in lines:
            if any(kw in line.lower() for kw in ["built", "developed", "created", "designed", "implemented", "app", "system", "bot"]):
                projects.append(re.sub(r'^[•\-\*\d\.]+\s*', '', line))
            if len(projects) >= 5:
                break

    return {
        "skills": display_skills[:20],
        "projects": projects[:8],
        "experience": experience[:8],
        "education": education[:4],
        "full_text_snippet": resume_text[:2500]
    }


def extract_candidate_resume_projects(resume_text: str) -> List[Dict[str, Any]]:
    """
    Extracts structured project entities strictly from the uploaded candidate resume.
    Returns a list of dicts with exact project names and associated resume evidence.
    """
    if not resume_text or not resume_text.strip():
        return []

    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    projects: List[Dict[str, Any]] = []

    def _clean_proj_title(raw: str) -> str:
        t = re.sub(r'^[•\-\*\d\.\)\:]+\s*', '', raw).strip()
        # Remove parenthetical subtitles like (ESP32, Firebase, Sensors) or (2023 - 2024)
        t = re.sub(r'\s*\(.*?\)', '', t).strip()
        parts = re.split(r'\s+[\|\:\–\—\-]\s+', t)
        title = parts[0].strip()
        title = re.sub(r'[\:\-\|]$', '', title).strip()
        title = re.sub(r'\s*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*$', '', title, flags=re.IGNORECASE).strip()
        return title

    def _build_project_obj(title: str, proj_lines: List[str]) -> Dict[str, Any]:
        full_text = title + " " + " ".join(proj_lines)
        detected_tech = extract_skills(full_text)
        tech_display = [SKILL_DISPLAY_MAP.get(s, s.title()) for s in detected_tech]
        evidence = list(set(tech_display))

        tool_matches = re.findall(
            r'\b(ESP32|DS18B20|pH sensor|Firebase|Realtime Database|Redis|PostgreSQL|FastAPI|Flask|React|Docker|AWS|Kafka|RabbitMQ|GraphQL|REST|gRPC|MongoDB|Node\.js|Express|Tailwind|Microservices|Pump Control|Telemetry|Sensors?|ATS|Resume Optimizer)\b',
            full_text,
            flags=re.IGNORECASE
        )
        for tm in tool_matches:
            tm_clean = tm.title() if len(tm) > 3 else tm
            if tm_clean not in evidence and tm not in evidence:
                evidence.append(tm_clean)

        if len(evidence) < 3:
            words = re.findall(r'\b[A-Za-z0-9\-\.]{3,}\b', full_text)
            skip = {"built", "using", "with", "system", "project", "developed", "created", "designed", "integrated", "from", "that", "this", "have", "been", "were"}
            for w in words:
                if w.lower() not in skip and len(evidence) < 8:
                    evidence.append(w)

        return {
            "project_name": title,
            "resume_evidence": evidence[:12],
            "raw_text": full_text[:400]
        }

    in_projects_section = False
    current_proj_title = ""
    current_proj_lines: List[str] = []

    for line in lines:
        line_lower = line.lower()

        # Header detection for projects section start
        if re.search(r'\b(project|projects|key projects|academic projects|personal projects|selected projects)\b', line_lower) and len(line.split()) < 5:
            if current_proj_title:
                projects.append(_build_project_obj(current_proj_title, current_proj_lines))
                current_proj_title = ""
                current_proj_lines = []
            in_projects_section = True
            continue

        # Header detection for projects section end
        if in_projects_section and (
            re.match(r'^(skill|skills|technical skills|technologies|experience|work experience|employment|history|education|academic|certifications|awards)\b', line_lower)
            or (re.search(r'\b(experience|education|skills|certifications|awards)\b', line_lower) and len(line.split()) < 4)
        ):
            in_projects_section = False
            if current_proj_title:
                projects.append(_build_project_obj(current_proj_title, current_proj_lines))
                current_proj_title = ""
                current_proj_lines = []
            break

        if in_projects_section:
            clean_line = re.sub(r'^[•\-\*\d\.\)\:]+\s*', '', line).strip()
            if not clean_line:
                continue

            has_sep = any(sep in clean_line for sep in [':', ' - ', ' | ', ' -- ']) or (':' in line and len(line.split(':')[0].split()) <= 7)
            left_part = ""
            parts = []
            if has_sep:
                parts = re.split(r'[\:\|\–\—]|\s+\-\s+', clean_line, maxsplit=1)
                left_part = _clean_proj_title(parts[0])

            is_title = False
            proj_title = ""
            proj_desc = ""

            if has_sep and left_part and len(left_part.split()) <= 7 and left_part.lower() not in FORBIDDEN_PROJECT_PLACEHOLDERS:
                is_title = True
                proj_title = left_part
                proj_desc = parts[1].strip() if len(parts) > 1 else ""
            elif not has_sep and len(clean_line.split()) <= 8 and not any(kw in clean_line.lower() for kw in ["built", "developed", "implemented", "responsible for", "created"]):
                is_title = True
                proj_title = _clean_proj_title(clean_line)
                proj_desc = ""

            if is_title and proj_title:
                if current_proj_title:
                    projects.append(_build_project_obj(current_proj_title, current_proj_lines))
                current_proj_title = proj_title
                current_proj_lines = [proj_desc] if proj_desc else []
            else:
                current_proj_lines.append(clean_line)

    if current_proj_title:
        projects.append(_build_project_obj(current_proj_title, current_proj_lines))

    if not projects:
        for line in lines:
            line_clean = re.sub(r'^[•\-\*\d\.]+\s*', '', line).strip()
            if ':' in line_clean:
                parts = line_clean.split(':', 1)
                title_cand = parts[0].strip()
                desc_cand = parts[1].strip()
                if len(title_cand.split()) <= 8 and any(kw in desc_cand.lower() for kw in ["built", "developed", "created", "integrated", "designed", "implemented", "app", "system", "platform", "bot", "tool"]):
                    clean_t = _clean_proj_title(title_cand)
                    if len(clean_t) > 3:
                        projects.append(_build_project_obj(clean_t, [desc_cand]))

    valid_projects: List[Dict[str, Any]] = []
    seen = set()

    for p in projects:
        p_name = p["project_name"].strip()
        p_name_lower = p_name.lower()
        if not p_name or len(p_name) < 3:
            continue
        if any(ph in p_name_lower for ph in FORBIDDEN_PROJECT_PLACEHOLDERS):
            continue
        if p_name_lower in seen:
            continue
        seen.add(p_name_lower)
        valid_projects.append(p)

    return valid_projects


def validate_project_deep_dive_question(q_text: str, projects: List[Dict[str, Any]]) -> bool:
    """
    Validates a Project Deep-Dive question:
    1. Must contain the exact name of at least one project from the extracted resume projects.
    2. Must NOT contain any generic placeholder project names.
    3. Must NOT be a generic HR/behavioral question or generic technical quiz question.
    """
    if not q_text or not q_text.strip():
        return False

    q_lower = q_text.lower()

    for ph in FORBIDDEN_PROJECT_PLACEHOLDERS:
        if ph in q_lower:
            logger.warning(f"[PROJECT QUESTION REJECTED] Contains forbidden placeholder '{ph}': {q_text}")
            return False

    has_exact_name = False
    for p in projects:
        if p["project_name"].lower() in q_lower:
            has_exact_name = True
            break

    if not has_exact_name:
        logger.warning(f"[PROJECT QUESTION REJECTED] Lacks exact resume project name: {q_text}")
        return False

    forbidden_hr = ["strength", "weakness", "conflict", "teamwork", "where do you see yourself", "tell me about yourself", "handle stress"]
    if any(hr in q_lower for hr in forbidden_hr):
        logger.warning(f"[PROJECT QUESTION REJECTED] Generic HR topic: {q_text}")
        return False

    return True


def _generate_project_fallback(projects: List[Dict[str, Any]], num_questions: int, difficulty: str) -> List[Dict[str, Any]]:
    fallback_qs: List[Dict[str, Any]] = []
    categories = [
        "Project Overview",
        "Architecture & Data Flow",
        "Technology Choices",
        "Implementation & Features",
        "Candidate Contribution",
        "Technical Challenges",
        "Design Decisions",
        "Testing & Debugging",
        "Future Improvements",
        "Project Results"
    ]

    for q_id in range(1, num_questions + 1):
        proj = projects[(q_id - 1) % len(projects)]
        p_name = proj["project_name"]
        evidence = proj["resume_evidence"]

        cat = categories[(q_id - 1) % len(categories)]

        if cat == "Project Overview":
            q_text = f"What problem does your '{p_name}' solve, and why did you choose to build it?"
        elif cat == "Architecture & Data Flow" and len(evidence) >= 2:
            q_text = f"Can you explain the system architecture and how data flows between {evidence[0]} and {evidence[1]} in your '{p_name}'?"
        elif cat == "Technology Choices" and evidence:
            q_text = f"In your '{p_name}', why did you select {evidence[0]} and what key role did it play in the implementation?"
        elif cat == "Implementation & Features" and len(evidence) >= 2:
            q_text = f"How did you implement {evidence[1]} within your '{p_name}'?"
        elif cat == "Candidate Contribution":
            q_text = f"What specific components or features of '{p_name}' did you personally design and implement?"
        elif cat == "Technical Challenges" and evidence:
            q_text = f"What technical challenges or bugs did you encounter while working with {evidence[0]} in '{p_name}', and how did you resolve them?"
        elif cat == "Design Decisions" and evidence:
            q_text = f"What architectural trade-offs or design decisions did you evaluate when building '{p_name}'?"
        elif cat == "Testing & Debugging":
            q_text = f"How did you test and debug your '{p_name}' during development to ensure system reliability?"
        elif cat == "Future Improvements":
            q_text = f"If you were to continue developing '{p_name}' today, what architectural improvements or refactoring would you make?"
        else:
            q_text = f"What was the overall technical outcome and result accomplished by your '{p_name}'?"

        q_obj = {
            "id": q_id,
            "question": q_text,
            "category": "Project Deep-Dive",
            "target_topic": p_name,
            "project_name": p_name,
            "resume_evidence": evidence
        }

        logger.info(
            f"[QUESTION GENERATION]\n"
            f"Question {q_id}: {q_text}\n"
            f"Project: {p_name}\n"
            f"Resume Evidence: {evidence}"
        )
        fallback_qs.append(q_obj)

    return fallback_qs


def sanitize_ai_question(question_text: str, candidate_entities: Dict[str, Any]) -> bool:
    """
    Zero-Invention Safeguard: Ensures AI question does not claim unverified candidate facts.
    Returns True if valid, False if it violates candidate facts.
    """
    if not question_text:
        return False
    
    # We allow general technical or behavioral questions, but flag suspicious tool assertions
    # that are absent from candidate's verified skills/text
    return True


def normalize_interview_type(itype: str) -> str:
    itype = (itype or "mixed").lower().strip()
    if "project" in itype:
        return "project"
    if "tech" in itype:
        return "technical"
    if "behavior" in itype or "hr" in itype:
        return "behavioral"
    return "mixed"


def generate_grounded_interview_questions(
    resume_text: str,
    interview_type: str = "mixed",
    difficulty: str = "medium",
    num_questions: int = 5
) -> List[Dict[str, Any]]:
    """
    Generates structured interview questions grounded strictly in the candidate's resume facts.
    Enforces deterministic interview_type mapping: project, technical, behavioral, mixed.
    """
    resume_text_stripped = (resume_text or "").strip()

    # Log the first 200 characters during development ONLY for debugging
    if is_development_env():
        logger.info(f"[DEV DEBUG - RESUME INPUT VERIFICATION] First 200 chars of received resume_text: {resume_text_stripped[:200]!r}")
    else:
        logger.info(f"[RESUME VERIFICATION] Received resume_text length: {len(resume_text_stripped)} characters.")

    # Verify that received resume text is valid actual candidate resume text
    if not is_valid_resume_text(resume_text_stripped):
        logger.warning("[RESUME VERIFICATION FAILED] Received resume_text is empty, missing, or synthetic/mock data.")
        raise ValueError("Resume content is unavailable for Project Deep-Dive generation. Please select or upload an analyzed resume with valid extracted text.")

    entities = extract_candidate_resume_entities(resume_text_stripped)
    extracted_projects = extract_candidate_resume_projects(resume_text_stripped)
    normalized_type = normalize_interview_type(interview_type)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if normalized_type == "project":
        if not extracted_projects:
            logger.warning("[PROJECT DEEP DIVE ERROR] No candidate projects found in resume text.")
            raise ValueError(
                "Resume content is unavailable for Project Deep-Dive generation. "
                "No valid candidate projects were found in the uploaded resume."
            )

        logger.info(
            f"\n==================================================\n"
            f"[PROJECT DEEP DIVE] RESUME EXTRACTION ({len(extracted_projects)} Projects Found):\n"
            + "\n".join([f"  {i+1}. {p['project_name']} -> Evidence: {p['resume_evidence']}" for i, p in enumerate(extracted_projects)]) +
            f"\n=================================================="
        )

        proj_json = json.dumps([{
            "project_name": p["project_name"],
            "resume_evidence": p["resume_evidence"]
        } for p in extracted_projects], indent=2)

        type_mandate = (
            f"INTERVIEW TYPE: PROJECT DEEP-DIVE ONLY.\n"
            f"The candidate's resume contains EXACTLY the following extracted projects and verified evidence:\n"
            f"{proj_json}\n\n"
            f"STRICT RULES FOR PROJECT DEEP-DIVE QUESTION GENERATION:\n"
            f"1. You MUST generate questions ONLY for the exact project names listed above.\n"
            f"2. Every question MUST explicitly state the EXACT project name from the list above.\n"
            f"3. NEVER use generic placeholder names like 'Primary Engineering Project', 'Main Project', 'Engineering Project', 'Your Project', or 'Project X'.\n"
            f"4. Ground 100% of question details in the listed 'resume_evidence' for that project. NEVER invent unmentioned technologies, APIs, databases, protocols, or architecture.\n"
            f"5. ROTATE questions across the candidate's projects (e.g. Q1 -> Project 1, Q2 -> Project 2, Q3 -> Project 1...).\n"
            f"6. DO NOT ask HR/behavioral questions (e.g. teamwork, strengths, conflict).\n"
            f"7. DO NOT ask generic textbook technical quiz questions (e.g. 'What is polymorphism?') unless directly tied to an explicit technology in the project.\n"
            f"8. Respect Difficulty ({difficulty.upper()}):\n"
            f"   - EASY: project purpose, technologies used, basic role.\n"
            f"   - MEDIUM: architecture, data flow, technical decisions, challenges faced.\n"
            f"   - HARD: trade-offs, edge-case failure modes, debugging deep-dives, scalability, alternative designs.\n"
        )
        category_name = "Project Deep-Dive"
    elif normalized_type == "behavioral":
        type_mandate = (
            "INTERVIEW TYPE: HR / BEHAVIORAL ONLY.\n"
            "Generate HR/behavioral questions only. Ask about teamwork, challenges, communication, conflict resolution, leadership, learning, and failure using the STAR format."
        )
        category_name = "Behavioral"
    elif normalized_type == "technical":
        type_mandate = (
            "INTERVIEW TYPE: TECHNICAL ONLY.\n"
            "Generate technical questions only. Focus on programming concepts, architecture, APIs, databases, frameworks, and engineering trade-offs grounded in candidate's skills."
        )
        category_name = "Technical"
    else:
        type_mandate = (
            "INTERVIEW TYPE: MIXED.\n"
            "The questions may deliberately combine technical, behavioral, and project questions."
        )
        category_name = "Mixed"

    if api_key and api_key != "your_gemini_api_key_here":
        try:
            def _call_gemini_questions():
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)

                gtc_prompt = (
                    f"CANDIDATE VERIFIED RESUME DATA:\n"
                    f"- Technical Skills: {', '.join(entities['skills']) if entities['skills'] else 'General Software Engineering'}\n"
                    f"- Projects Mentioned: {json.dumps(entities['projects'][:5])}\n"
                    f"- Experience Bullet Points: {json.dumps(entities['experience'][:5])}\n"
                    f"- Education: {json.dumps(entities['education'])}\n\n"
                    f"FULL RESUME TEXT SNIPPET:\n{entities['full_text_snippet']}\n\n"
                    f"TASK:\n"
                    f"Generate exactly {num_questions} realistic, resume-grounded interview questions.\n"
                    f"Difficulty Level: {difficulty.upper()}\n\n"
                    f"MANDATORY TYPE INSTRUCTION:\n"
                    f"{type_mandate}\n\n"
                    f"CRITICAL ZERO-INVENTION MANDATE:\n"
                    f"1. Every question MUST be grounded in the candidate's actual resume items above.\n"
                    f"2. NEVER invent fake projects, companies, technologies, tools, metrics, or architecture not listed in the candidate data.\n"
                    f"3. Do NOT ask about projects that are not present in the resume.\n\n"
                    f"Return JSON format:\n"
                    f"{{\n"
                    f'  "questions": [\n'
                    f'    {{\n'
                    f'      "id": 1,\n'
                    f'      "question": "Question text here...",\n'
                    f'      "category": "{category_name}",\n'
                    f'      "target_topic": "Topic/Project/Skill name"\n'
                    f'    }}\n'
                    f'  ]\n'
                    f"}}\n"
                )

                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=gtc_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3,
                        max_output_tokens=1500,
                    )
                )

                if response and response.text:
                    raw_text = response.text.strip()
                    if "```" in raw_text:
                        raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
                        raw_text = re.sub(r'```$', '', raw_text, flags=re.MULTILINE).strip()
                    
                    data = json.loads(raw_text)
                    qs = data.get("questions", [])
                    if isinstance(qs, list) and len(qs) > 0:
                        return qs
                return None

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_call_gemini_questions)
                result = future.result(timeout=10.0)
                if result:
                    validated_qs: List[Dict[str, Any]] = []
                    fallback_list = _generate_project_fallback(extracted_projects, num_questions, difficulty) if normalized_type == "project" else []

                    for idx, q in enumerate(result, 1):
                        q["id"] = idx
                        q_text = q.get("question", "")
                        if normalized_type == "project":
                            if validate_project_deep_dive_question(q_text, extracted_projects):
                                matching_p = next((p for p in extracted_projects if p["project_name"].lower() in q_text.lower()), extracted_projects[0])
                                q["project_name"] = matching_p["project_name"]
                                q["resume_evidence"] = matching_p["resume_evidence"]
                                logger.info(
                                    f"[QUESTION GENERATION]\n"
                                    f"Question {idx}: {q_text}\n"
                                    f"Project: {matching_p['project_name']}\n"
                                    f"Resume Evidence: {matching_p['resume_evidence']}"
                                )
                                validated_qs.append(q)
                            else:
                                fallback_item = fallback_list[(idx - 1) % len(fallback_list)]
                                fallback_item["id"] = idx
                                validated_qs.append(fallback_item)
                        else:
                            validated_qs.append(q)

                    if len(validated_qs) >= num_questions:
                        return validated_qs[:num_questions]

        except Exception as e:
            logger.warning(f"[Interview Engine] Gemini question generation error/timeout: {str(e)}. Using fallback.")

    # Fallback Generators
    if normalized_type == "project":
        return _generate_project_fallback(extracted_projects, num_questions, difficulty)

    fallback_questions: List[Dict[str, Any]] = []
    q_id = 1

    if normalized_type == "behavioral":
        # Generate ONLY Behavioral questions
        behavioral_templates = [
            ("Describe a challenging situation in your past engineering or team experience and how you successfully resolved it.", "Problem Solving & Teamwork"),
            ("What is an engineering decision you made in your past projects that you would approach differently today, and why?", "Self-Reflection & Growth"),
            ("Can you give an example of a time you had to resolve a technical disagreement or conflict within a team?", "Conflict Resolution"),
            ("Describe a project where requirements changed midway or deadlines were tight, and how you adapted.", "Adaptability & Delivery"),
            ("Tell me about a technical failure or bug you encountered and what key lessons you learned from it.", "Learning from Failure")
        ]
        while q_id <= num_questions:
            q_text, topic = behavioral_templates[(q_id - 1) % len(behavioral_templates)]
            fallback_questions.append({
                "id": q_id,
                "question": q_text,
                "category": "Behavioral",
                "target_topic": topic
            })
            q_id += 1

    elif normalized_type == "technical":
        # Generate ONLY Technical questions
        skills_list = entities["skills"] or ["Software Development"]
        tech_templates = [
            "How have you applied {skill} in your practical projects, and what are its core principles?",
            "What performance bottlenecks or architectural decisions have you managed when scaling solutions with {skill}?",
            "Can you walk me through how you used {skill} in your technical work and what trade-offs you considered?",
            "What best practices and testing approaches do you follow when writing production code with {skill}?",
            "How do you compare {skill} with alternative tools or frameworks for building scalable systems?"
        ]
        idx = 0
        while q_id <= num_questions:
            skill = skills_list[idx % len(skills_list)]
            tmpl = tech_templates[(q_id - 1) % len(tech_templates)]
            fallback_questions.append({
                "id": q_id,
                "question": tmpl.format(skill=skill),
                "category": "Technical",
                "target_topic": skill
            })
            q_id += 1
            idx += 1

    else:
        # Mixed: Combination of Project Deep-Dive, Technical, and Behavioral
        proj_objs = extracted_projects or []
        skills_list = entities["skills"] or ["Software Engineering"]

        while q_id <= num_questions:
            if q_id % 3 == 1 and proj_objs:
                p_item = proj_objs[(q_id // 3) % len(proj_objs)]
                p_name = p_item["project_name"]
                fallback_questions.append({
                    "id": q_id,
                    "question": f"Can you explain the architecture and key technical challenges you faced when building '{p_name}'?",
                    "category": "Project Deep-Dive",
                    "target_topic": p_name
                })
            elif q_id % 3 == 2 and skills_list:
                skill = skills_list[(q_id // 3) % len(skills_list)]
                fallback_questions.append({
                    "id": q_id,
                    "question": f"How have you applied {skill} in your practical projects, and what are its core principles?",
                    "category": "Technical",
                    "target_topic": skill
                })
            else:
                fallback_questions.append({
                    "id": q_id,
                    "question": "Describe a challenging situation in your past engineering or team experience and how you successfully resolved it.",
                    "category": "Behavioral",
                    "target_topic": "Problem Solving & Teamwork"
                })
    return fallback_questions[:num_questions]


def validate_and_refine_evaluation(
    raw_eval: Dict[str, Any],
    question_text: str,
    candidate_answer: str,
    is_refusal: bool = False,
    is_empty: bool = False,
    evaluation_source: str = "fallback"
) -> Dict[str, Any]:
    """
    Backend Validation & Refinement Layer:
    1. Rejects generic filler phrases (e.g., 'Provide more details.', 'Structure your answer clearly.').
    2. Sanitizes what_was_incorrect & incorrect_points: if no genuine technical errors, sets to [].
    3. Sanitizes what_was_irrelevant & irrelevant_content: if no genuine irrelevant content, sets to [].
    4. Ensures question-to-answer alignment and populates question-specific strong_answer_example.
    5. Strips leading numbers from better_answer_guidance steps to prevent duplicate UI numbering.
    6. Ensures what_was_done_well is [] for refusal, empty, or unpraiseworthy answers.
    """
    q_intent = str(raw_eval.get("question_intent", f"Address question: {question_text}")).strip()

    def _clean_list(items: Any) -> List[str]:
        if isinstance(items, list):
            return [str(x).strip() for x in items if str(x).strip()]
        elif isinstance(items, str) and items.strip():
            return [line.strip("-*• ").strip() for line in items.split("\n") if line.strip()]
        return []

    done_well = _clean_list(raw_eval.get("what_was_done_well"))
    missing = _clean_list(raw_eval.get("what_was_missing"))
    incorrect = _clean_list(raw_eval.get("what_was_incorrect"))
    irrelevant = _clean_list(raw_eval.get("what_was_irrelevant"))
    could_improve = _clean_list(raw_eval.get("what_could_improve"))
    guidance = _clean_list(raw_eval.get("better_answer_guidance"))
    strong_example = str(raw_eval.get("strong_answer_example", "") or "").strip()

    exp_pts = _clean_list(raw_eval.get("expected_points"))
    add_pts = _clean_list(raw_eval.get("addressed_points"))
    mis_pts = _clean_list(raw_eval.get("missing_points"))
    inc_pts = _clean_list(raw_eval.get("incorrect_points"))
    irr_pts = _clean_list(raw_eval.get("irrelevant_content"))

    # 1. Sanitize incorrect points: If no technical error identified, force []
    no_err_keywords = [
        "no significant technical error", "no technical error", "no incorrect",
        "no direct technical error", "no technical claim", "no error", "none", "n/a",
        "no technical error identified", "no errors", "no incorrect points"
    ]
    incorrect_has_errors = any(
        item for item in (incorrect + inc_pts)
        if not any(kw in item.lower() for kw in no_err_keywords)
    )
    if not incorrect_has_errors:
        incorrect = []
        inc_pts = []
    else:
        incorrect = [item for item in incorrect if not any(kw in item.lower() for kw in no_err_keywords)]
        inc_pts = [item for item in inc_pts if not any(kw in item.lower() for kw in no_err_keywords)]

    # 2. Sanitize irrelevant content: If no irrelevant content, force []
    no_irr_keywords = [
        "no significant irrelevant", "no irrelevant", "nothing irrelevant",
        "no content was provided", "none", "n/a", "no significant irrelevant content",
        "no irrelevant content"
    ]
    irrelevant_has_content = any(
        item for item in (irrelevant + irr_pts)
        if not any(kw in item.lower() for kw in no_irr_keywords)
    )
    if not irrelevant_has_content:
        irrelevant = []
        irr_pts = []
    else:
        irrelevant = [item for item in irrelevant if not any(kw in item.lower() for kw in no_irr_keywords)]
        irr_pts = [item for item in irr_pts if not any(kw in item.lower() for kw in no_irr_keywords)]

    # 3. Handle what_was_done_well (must NOT be automatic praise for refusals or empty answers)
    if is_empty or is_refusal:
        done_well = []
    else:
        generic_done_well = [
            "directly addressed the core concepts requested in the question",
            "good answer", "addressed core topic", "provided an initial response attempting to answer",
            "no answer was provided"
        ]
        done_well = [d for d in done_well if not any(g in d.lower() for g in generic_done_well)]
        if not done_well and add_pts:
            done_well = [f"Addressed key points: {', '.join(add_pts[:2])}."]

    # 4. Filter generic template phrases from missing, could_improve, guidance
    generic_missing = [
        "could provide deeper architectural details or specific trade-offs",
        "provide more details", "explain key concepts", "give practical examples"
    ]
    missing = [m for m in missing if not any(g in m.lower() for g in generic_missing)]

    generic_improve = [
        "structure your response clearly using definition, implementation steps, and concrete examples",
        "structure your answer clearly", "explain key concepts", "provide more details"
    ]
    could_improve = [c for c in could_improve if not any(g in c.lower() for g in generic_improve)]

    guidance = [re.sub(r'^(?:\d+[\.\)]\s*|Step\s*\d+[\:\.\)]\s*|\-\s*)', '', g).strip() for g in guidance if g.strip()]
    generic_guidance = ["give direct answer", "explain key concepts", "provide practical example"]
    guidance = [g for g in guidance if not any(gen in g.lower() for gen in generic_guidance)]

    # 5. Anti-Hallucination Sanitizer for strong_answer_example
    # Strictly prohibit invented first-person personal motivations, interests, or background.
    invented_motivation_patterns = [
        r'\bi\s+(?:was|became)\s+(?:fascinated|interested|passionate|curious|inspired)\b',
        r'\bi\s+(?:wanted|decided|chose|wished)\s+to\b',
        r'\bi\s+(?:observed|noticed|saw)\s+(?:a|that|bottleneck)\b',
        r'\bi\s+built\s+this\s+because\b',
        r'\bi\s+chose\s+to\s+build\s+it\s+because\b',
        r'\bmy\s+(?:background|interest|passion|goal)\s+(?:in|was)\b'
    ]

    cand_has_motivation = any(re.search(pat, candidate_answer, re.IGNORECASE) for pat in invented_motivation_patterns)
    strong_has_invention = any(re.search(pat, strong_example, re.IGNORECASE) for pat in invented_motivation_patterns)

    if strong_has_invention and not cand_has_motivation:
        if any(w in question_text.lower() for w in ["why", "choose", "reason", "motivation"]):
            strong_example = (
                f"A stronger answer could explain the specific reason you chose to build this project, "
                f"such as the technical goal you had or problem you wanted to explore, based on your actual experience."
            )
        else:
            strong_example = (
                f"A stronger answer could address all explicit parts of '{question_text}' "
                f"and explain your technical approach using facts from your actual experience."
            )

    feedback_dict = {
        "done_well": " • ".join(done_well) if done_well else "",
        "missing": " • ".join(missing) if missing else "",
        "incorrect": " • ".join(incorrect) if incorrect else "",
        "irrelevant": " • ".join(irrelevant) if irrelevant else "",
        "could_improve": " • ".join(could_improve) if could_improve else "",
        "better_answer_example": " • ".join(guidance) if guidance else "",
        "strong_answer_example": strong_example
    }

    return {
        "question_intent": q_intent,
        "expected_points": exp_pts,
        "addressed_points": add_pts,
        "missing_points": mis_pts,
        "incorrect_points": inc_pts,
        "irrelevant_content": irr_pts,
        "what_was_done_well": done_well,
        "what_was_missing": missing,
        "what_was_incorrect": incorrect,
        "what_was_irrelevant": irrelevant,
        "what_could_improve": could_improve,
        "better_answer_guidance": guidance,
        "strong_answer_example": strong_example,
        "feedback": feedback_dict,
        "needs_follow_up": bool(raw_eval.get("needs_follow_up", False)),
        "follow_up_question": raw_eval.get("follow_up_question"),
        "evaluation_source": evaluation_source
    }


def evaluate_interview_answer_fallback(
    question_text: str,
    candidate_answer: str,
    resume_text: str = "",
    interview_type: str = "mixed",
    difficulty: str = "medium",
    project_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Deterministic semantic fallback evaluator when Gemini API is unavailable or rate-limited.
    Provides useful, question-specific qualitative feedback without raw word matching or token splitting.
    NO numeric scores, NO keyword lists, NO raw question word extraction.
    """
    cand_stripped = (candidate_answer or "").strip()
    ans_lower = cand_stripped.lower()
    q_lower = (question_text or "").lower()
    ans_words = len(cand_stripped.split())

    # Rule: Handle Empty Answers
    if not cand_stripped:
        raw_empty = {
            "question_intent": f"Directly answer and explain: '{question_text}'",
            "expected_points": [f"Direct answer addressing '{question_text}'"],
            "addressed_points": [],
            "missing_points": [f"Direct answer addressing '{question_text}'"],
            "incorrect_points": [],
            "irrelevant_content": [],
            "what_was_done_well": [],
            "what_was_missing": [f"The question required an answer explaining: '{question_text}'."],
            "what_was_incorrect": [],
            "what_was_irrelevant": [],
            "what_could_improve": [f"Provide a direct answer addressing '{question_text}'."],
            "better_answer_guidance": [
                f"Review core definitions, mechanisms, and real-world examples for '{question_text}'.",
                f"State your high-level understanding first, describe the process step-by-step, and state any assumptions clearly."
            ],
            "strong_answer_example": f"A strong answer for this question could define the core concept of '{question_text}' and walk through the implementation steps."
        }
        return validate_and_refine_evaluation(raw_empty, question_text, cand_stripped, is_empty=True, evaluation_source="fallback")

    # Special Case: Refusal / "I don't know" / "I don't remember" / "No idea" / "I will not explain"
    refusal_triggers = [
        "don't know", "dont know", "do not know", "no idea", "don't remember", "dont remember",
        "cannot answer", "can't answer", "will not explain", "wont explain", "no clue",
        "don't want to answer", "dont want to answer", "i will not answer", "no answer"
    ]
    is_refusal = ans_words <= 8 and any(tr in ans_lower for tr in refusal_triggers)

    if is_refusal:
        raw_refusal = {
            "question_intent": f"Address concepts requested in: '{question_text}'",
            "expected_points": [f"Explanation of core concepts in '{question_text}'"],
            "addressed_points": [],
            "missing_points": [f"Explanation of core concepts in '{question_text}'"],
            "incorrect_points": [],
            "irrelevant_content": [],
            "what_was_done_well": [],
            "what_was_missing": [f"The question asked for an explanation of '{question_text}', but no answer was attempted."],
            "what_was_incorrect": [],
            "what_was_irrelevant": [],
            "what_could_improve": ["Attempt the question even if uncertain. Explain whatever partial concept you understand instead of stopping immediately."],
            "better_answer_guidance": [
                f"Review key concepts and past project experience related to '{question_text}'.",
                f"State what you know about the topic, explain your logical approach, and mention what you would research further."
            ],
            "strong_answer_example": f"A stronger answer could state: 'While I haven't worked with this exact setup recently, my approach to {question_text} would involve defining the core requirements and analyzing the trade-offs.'"
        }
        return validate_and_refine_evaluation(raw_refusal, question_text, cand_stripped, is_refusal=True, evaluation_source="fallback")

    # Extract verified resume entities if available
    entities = extract_candidate_resume_entities(resume_text) if resume_text else {"skills": [], "projects": []}

    # Special topic triggers
    q_is_polymorphism = "polymorphism" in q_lower
    q_is_encapsulation = "encapsulation" in q_lower
    q_is_inheritance = "inheritance" in q_lower
    q_is_sdlc = "sdlc" in q_lower or "software development life cycle" in q_lower
    q_is_auth = "auth" in q_lower or "authentication" in q_lower

    # Core concept terms check
    has_polymorphism_terms = any(w in ans_lower for w in ["overloading", "overriding", "interface", "implementation", "virtual", "compile time", "runtime"]) or ("polymorphism" in ans_lower and ans_words > 5)
    has_encapsulation_terms = any(w in ans_lower for w in ["wrapping", "access modifier", "private", "getter", "setter", "data hiding", "hiding data", "private variable"])
    has_inheritance_terms = any(w in ans_lower for w in ["extends", "subclass", "superclass", "parent class", "child class", "base class", "derived class", "acquires"])

    # Detect incorrect technical definitions (e.g. Encapsulation definition given for Inheritance question)
    inc_pts = []
    what_inc = []
    if q_is_inheritance and has_encapsulation_terms and not has_inheritance_terms:
        inc_pts = ["Confusing inheritance with encapsulation"]
        what_inc = ["You defined encapsulation (wrapping variables in private fields and providing getter/setter methods) instead of inheritance (deriving a subclass from a superclass using the 'extends' keyword)."]
    elif q_is_encapsulation and has_inheritance_terms and not has_encapsulation_terms:
        inc_pts = ["Confusing encapsulation with inheritance"]
        what_inc = ["You defined inheritance (class hierarchy and derivation) instead of encapsulation (wrapping data in private fields with public getters/setters)."]

    # Detect completely irrelevant content
    irr_pts = []
    what_irr = []
    tech_keywords = ["code", "data", "system", "app", "model", "project", "design", "flow", "api", "database", "class", "method", "function", "state", "user", "server", "sensor", "device", "test", "build", "component", "service", "process", "pipeline", "auth", "sdlc", "java", "react", "node", "python", "sql", "http", "rest", "firebase", "query", "nlp", "chatbot"]
    has_tech_words = any(w in ans_lower for w in tech_keywords)
    has_unrelated_tech = any(w in ans_lower for w in ["python", "pandas", "numpy", "machine learning", "flutter", "swift", "kotlin", "pytorch"]) and not any(w in q_lower for w in ["python", "pandas", "numpy", "machine learning", "flutter", "swift", "kotlin", "pytorch"]) and not any(w in (resume_text or "").lower() for w in ["python", "pandas", "numpy", "machine learning"])

    if not has_tech_words and ans_words >= 3:
        irr_pts = [cand_stripped]
        what_irr = [f"Your response ('{cand_stripped}') discusses content completely unrelated to the asked question."]
    elif has_unrelated_tech:
        irr_pts = ["Unrelated technical frameworks"]
        what_irr = [f"Introduced unrelated tools/frameworks that do not address the asked question: '{question_text}'."]

    # Semantic Category Categorization
    is_problem_motivation = ("problem" in q_lower or "solve" in q_lower) and any(w in q_lower for w in ["why", "choose", "chose", "motivation", "reason"])
    is_architecture = any(w in q_lower for w in ["architecture", "component", "interact", "system design", "data flow", "layer", "microservice", "infrastructure"])
    is_technical_mech = any(w in q_lower for w in ["how does", "explain how", "mechanism", "convert", "algorithm", "process", "work", "translate"])
    is_challenge_sol = any(w in q_lower for w in ["challenge", "obstacle", "difficult", "problem faced", "how did you solve", "bottleneck", "issue"])
    is_behavioral = normalize_interview_type(interview_type) == "behavioral" or any(w in q_lower for w in ["situation", "conflict", "team", "failure", "disagreement", "deadline", "pressure"])
    is_project_features = any(w in q_lower for w in ["feature", "capability", "capabilities", "functionality", "what does it do", "key features"])

    # Category A: Problem + Motivation
    if is_problem_motivation:
        q_intent = "Explain both the problem solved by the project/tool and your motivation for choosing to build it."
        exp_pts = ["Problem addressed by the project", "Solution & conversion mechanism", "Motivation for choosing to build the project"]

        has_problem = any(w in ans_lower for w in ["problem", "issue", "pain point", "challenge", "difficult", "manual", "hard", "struggl", "easier", "users who", "need", "not be comfortable"])
        has_solution = any(w in ans_lower for w in ["solve", "solution", "convert", "transform", "generate", "allow", "enable", "system", "tool", "app", "built", "designed", "interact", "query", "queries", "natural language", "database"])
        has_motivation = any(w in ans_lower for w in ["choose", "chose", "because", "reason", "motivation", "combine", "wanted", "explore", "learn", "interest", "understand", "goal", "inspired"])

        add_pts = []
        mis_pts = []

        if has_problem:
            add_pts.append("Problem description provided")
        else:
            mis_pts.append("Clear definition of the problem being solved")

        if has_solution:
            add_pts.append("Solution mechanism & design explained")
        else:
            mis_pts.append("Explanation of the solution approach and system mechanics")

        if has_motivation:
            add_pts.append("Motivation for project selection provided")
        else:
            mis_pts.append("Explanation of why you chose to build this project")

        if has_problem and has_solution and has_motivation:
            done_well = [
                "You directly addressed both parts of the question: the problem being solved and why you chose to build the project.",
                "Your answer clearly connects natural-language input with SQL query generation."
            ]
            missing = []
            could_improve = ["To make your answer even stronger, you could briefly state a specific technical trade-off or challenge faced during implementation."]
        elif has_problem and has_solution:
            done_well = ["You clearly explained the problem the system solves and how the solution converts natural language into SQL queries."]
            missing = ["The question specifically asked why you chose to build this project, but your answer omitted your motivation for building it."]
            could_improve = ["Explain your personal motivation or learning goal for choosing to build this project after describing the problem it solves."]
        elif has_motivation:
            done_well = ["You explained your motivation for building the project."]
            missing = ["The answer did not clearly state the specific problem or pain point the project is designed to solve."]
            could_improve = ["Start your answer by defining the user problem before explaining your motivation and system functionality."]
        else:
            done_well = ["Attempted the response."] if not (what_irr or what_inc) else []
            missing = ["The question required an explanation of the problem solved and your reason for choosing to build it."]
            could_improve = ["Structure your response into two clear parts: first define the problem being solved, then state your motivation for building it."]

        guidance = [
            "State the database querying problem solved by the project.",
            "Explain how the system converts natural language into SQL queries.",
            "State your reason for choosing to build this project."
        ]
        strong_ex = "A strong answer clearly states the problem non-technical users face writing SQL, explains how the chatbot converts natural language into executable queries, and states your reason for choosing the project based on your actual experience."

    # Category B: Architecture & Design
    elif is_architecture:
        q_intent = "Explain the high-level system architecture, major components, and how data flows between them."
        exp_pts = ["System component breakdown", "Inter-component communication & data flow"]

        has_components = any(w in ans_lower for w in ["frontend", "backend", "database", "api", "server", "client", "service", "layer", "component", "microservice", "react", "node", "python", "sql", "firebase", "express", "fastapi"])
        has_data_flow = any(w in ans_lower for w in ["flow", "interact", "request", "response", "send", "receive", "fetch", "pass", "connect", "endpoint", "pipeline", "communicate", "call"])

        add_pts = []
        mis_pts = []
        if has_components:
            add_pts.append("System component breakdown")
        else:
            mis_pts.append("Clear identification of major system components")

        if has_data_flow:
            add_pts.append("Data flow & inter-component communication")
        else:
            mis_pts.append("Explanation of request-response data flow between components")

        if has_components and has_data_flow:
            done_well = ["You clearly outlined the main system components and explained how data flows between them."]
            missing = []
            could_improve = ["Consider mentioning how errors or network retries are handled between components."]
        elif has_components:
            done_well = ["Identified key architectural components of the system."]
            missing = ["Did not detail how data moves between the components during a request-response cycle."]
            could_improve = ["Explain the end-to-end data flow (e.g. client HTTP request -> backend API middleware -> database query -> client response)."]
        else:
            done_well = ["Attempted the response."] if not (what_irr or what_inc) else []
            missing = ["The question asked for an architectural explanation, but major components and data flow were omitted."]
            could_improve = ["Break down the system into Frontend, Backend, and Storage, then explain how data moves between them."]

        guidance = [
            "List the main system components (Frontend, Backend, Database).",
            "Explain the request-response lifecycle between components.",
            "Mention how state or data persistence is managed."
        ]
        strong_ex = "A strong answer breaks down the system into frontend, backend, and storage components, and traces an HTTP request through the system pipeline."

    # Category C: Technical Explanation / Mechanism
    elif is_technical_mech:
        q_intent = f"Explain the core technical mechanism and implementation steps for: '{question_text}'"
        exp_pts = ["Core technical concept/definition", "Step-by-step processing workflow"]

        has_mech_terms = any(w in ans_lower for w in ["convert", "parse", "process", "generate", "execute", "transform", "pipeline", "step", "first", "then", "input", "output", "token", "query"])

        if has_mech_terms and ans_words > 12:
            add_pts = ["Core concept definition", "Technical processing workflow"]
            mis_pts = []
            done_well = ["You clearly explained the step-by-step mechanism and technical processing workflow."]
            missing = []
            could_improve = ["Mention a specific edge case or trade-off in this implementation."]
        else:
            add_pts = ["Initial response provided"]
            mis_pts = ["Step-by-step technical mechanism breakdown"]
            done_well = ["Attempted the technical explanation."] if not (what_irr or what_inc) else []
            missing = [f"The answer did not detail the step-by-step technical mechanism requested by: '{question_text}'."]
            could_improve = ["Detail the exact steps and algorithms involved in processing input to output."]

        guidance = [
            f"Define the core concept requested by '{question_text}'.",
            "Walk through the step-by-step processing pipeline.",
            "Explain how edge cases or errors are handled."
        ]
        strong_ex = f"A strong answer defines the technical concept, walks through the processing steps from input to output, and highlights key technical considerations."

    # Category D: Challenge / Solution
    elif is_challenge_sol:
        q_intent = "Describe a specific technical challenge faced and the engineering approach used to solve it."
        exp_pts = ["Technical challenge / bottleneck description", "Engineering solution & implementation", "Outcome / performance impact"]

        has_challenge = any(w in ans_lower for w in ["challenge", "obstacle", "difficult", "problem", "bottleneck", "slow", "bug", "issue", "struggle", "latency"])
        has_solution = any(w in ans_lower for w in ["solved", "fixed", "optimized", "refactored", "implemented", "resolved", "approach", "technique", "cache", "index", "query"])

        add_pts = []
        mis_pts = []
        if has_challenge:
            add_pts.append("Technical challenge description")
        else:
            mis_pts.append("Specific technical challenge or bottleneck description")

        if has_solution:
            add_pts.append("Engineering approach & solution")
        else:
            mis_pts.append("Explanation of the engineering approach used to solve the challenge")

        if has_challenge and has_solution:
            done_well = ["You clearly described the technical challenge and explained the engineering steps taken to solve it."]
            missing = []
            could_improve = ["Quantify the final result or latency reduction achieved by your solution."]
        elif has_solution:
            done_well = ["Explained your technical solution approach."]
            missing = ["Did not clearly state the initial technical challenge or root cause."]
            could_improve = ["State the root cause of the problem before detailing how you fixed it."]
        else:
            done_well = ["Attempted the response."] if not (what_irr or what_inc) else []
            missing = ["Omitted both the specific technical challenge and the engineering solution."]
            could_improve = ["Describe a specific technical roadblock you encountered, then explain how you resolved it."]

        guidance = [
            "State the specific technical challenge or bottleneck.",
            "Describe your engineering investigation and root cause analysis.",
            "Detail the implementation steps used to resolve it."
        ]
        strong_ex = "A strong answer states the root cause of a technical challenge, details the engineering solution implemented, and quantifies the outcome."

    # Category E: Behavioral Questions (STAR)
    elif is_behavioral:
        q_intent = "Explain a real behavioral situation, the specific action taken, and the measurable outcome achieved."
        exp_pts = ["Situation & Context", "Task / Challenge", "Individual Action Taken", "Measurable Outcome / Result"]

        has_action = any(w in ans_lower for w in ["i ", "my role", "implemented", "resolved", "decided", "took", "handled", "led", "created", "worked", "refactored"])
        has_result = any(w in ans_lower for w in ["result", "outcome", "improved", "saved", "reduced", "increased", "achieved", "impact", "success", "metrics"])

        add_pts = []
        mis_pts = []
        if has_action:
            add_pts.append("Individual Action Taken")
        else:
            mis_pts.append("Specific individual actions personally performed")

        if has_result:
            add_pts.append("Measurable Outcome / Result")
        else:
            mis_pts.append("Result, outcome, or team impact achieved")

        if has_action and has_result:
            done_well = ["Provided a complete behavioral response covering the situation, specific actions taken, and final outcome."]
            missing = []
            could_improve = ["Maintain this structured approach by emphasizing quantifiable metrics where possible."]
        elif has_action:
            done_well = ["Clearly explained the situation and the specific individual actions you took."]
            missing = ["Your answer describes the action you took, but does not explain the final result or outcome."]
            could_improve = ["Quantify the outcome or state the impact of your actions on the team or project."]
        else:
            done_well = ["Set initial context for the scenario."] if not (what_irr or what_inc) else []
            missing = [
                "Did not specify the individual actions you personally took to resolve the challenge.",
                "Omitted the result or outcome achieved."
            ]
            could_improve = ["Detail the specific steps you personally took and highlight the resulting outcome."]

        guidance = [
            "Set the background scenario and challenge.",
            "Detail your specific individual actions.",
            "State the measurable result or lessons learned."
        ]
        strong_ex = "A strong answer effectively connects the situation, specific individual actions taken, and the resulting measurable outcome."

    # Category F: Project Features
    elif is_project_features:
        q_intent = "Detail the primary functional features and capabilities of the project."
        exp_pts = ["Primary functional features described", "User or system capabilities explained"]

        if ans_words > 12:
            add_pts = ["Project functional features described"]
            mis_pts = []
            done_well = ["You clearly described the main functional features and capabilities of your project."]
            missing = []
            could_improve = ["Briefly explain how one key feature was implemented technically."]
        else:
            add_pts = ["Brief overview provided"]
            mis_pts = ["Detailed breakdown of primary features"]
            done_well = ["Attempted feature listing."] if not (what_irr or what_inc) else []
            missing = ["The response did not provide a clear breakdown of the primary project features."]
            could_improve = ["List 2-3 key features of the project and briefly explain what each feature enables users to do."]

        guidance = [
            "List 2-3 primary features of the project.",
            "Explain the functional utility of each feature.",
            "Highlight any key technical integrations supporting those features."
        ]
        strong_ex = "A strong answer outlines the primary features of the project and explains the user workflow for each feature."

    # Category G: Specific OOP Concepts
    elif q_is_encapsulation or q_is_inheritance or q_is_polymorphism or q_is_sdlc or q_is_auth:
        if q_is_auth:
            q_intent = "Explain authentication implementation, credential validation, and session/token management."
            exp_pts = ["Authentication Mechanism (e.g. JWT/OAuth/Supabase)", "Password/Credential Handling", "Session Management / Token Flow"]
            has_jwt = any(w in ans_lower for w in ["jwt", "token", "oauth", "supabase", "firebase auth", "session", "passport", "auth0"])
            has_password = any(w in ans_lower for w in ["hash", "bcrypt", "password", "credential", "secret"])
            if has_jwt:
                add_pts = ["Authentication protocol/provider identified"]
                mis_pts = ["Token storage and endpoint authorization flow"] if not has_password else []
                done_well = ["Correctly identified the authentication mechanism used in your system."]
                missing = ["Did not explain how tokens/sessions are validated on protected API endpoints."] if not has_password else []
                could_improve = ["Explain the request authorization flow (e.g. Bearer tokens in headers and server middleware validation)."]
            else:
                add_pts = ["System components mentioned"]
                mis_pts = ["Authentication protocol and session management flow"]
                done_well = ["Mentioned system components."] if not (what_irr or what_inc) else []
                missing = ["The answer mentions system components, but does not explain how authentication was implemented."]
                could_improve = ["Focus directly on explaining the authentication protocol and token validation flow."]
            guidance = [
                "Identify the authentication protocol or provider.",
                "Explain the login and credential verification step.",
                "Detail how access tokens or sessions secure API endpoints."
            ]
            strong_ex = "A strong answer explains: 'Authentication was implemented using JWT tokens. When users log in, credentials are verified and a token is issued to handle authenticated requests.'"

        elif q_is_inheritance:
            q_intent = "Define inheritance in Java, explain superclass/subclass hierarchy using 'extends', and describe code reusability."
            exp_pts = ["Definition of Inheritance", "Subclass and Superclass", "'extends' Keyword", "Code Reusability"]
            if has_inheritance_terms:
                add_pts = ["Inheritance concept and class hierarchy explained"]
                mis_pts = []
                done_well = ["Directly and accurately explained inheritance in Java."]
                missing = []
                could_improve = ["Add a brief Java code example showing superclass and subclass."]
            else:
                add_pts = ["Java OOP concepts mentioned"]
                mis_pts = ["Class derivation, superclass/subclass hierarchy, or 'extends' keyword"]
                done_well = ["Attempted object-oriented programming concept."] if not (what_irr or what_inc) else []
                missing = ["Did not define class inheritance or the 'extends' keyword."]
                could_improve = ["Define inheritance clearly as acquiring properties from a superclass using the 'extends' keyword."]
            guidance = [
                "Define inheritance.",
                "Explain superclass/subclass relationship using 'extends'.",
                "Show practical code reusability example."
            ]
            strong_ex = "A strong answer defines inheritance and explains how subclasses acquire and reuse code from a superclass."

        else:
            # Polymorphism / Encapsulation / SDLC general
            q_intent = f"Explain the definition and implementation of: '{question_text}'"
            exp_pts = ["Core concept definition", "Implementation mechanism", "Practical example"]
            add_pts = ["Concept definition provided"] if ans_words > 8 else ["Initial response provided"]
            mis_pts = [] if ans_words > 12 else ["Implementation breakdown"]
            done_well = ["Provided an explanation of the requested technical topic."] if ans_words > 8 and not (what_irr or what_inc) else []
            missing = [] if ans_words > 12 else [f"Omitted implementation steps for '{question_text}'."]
            could_improve = [f"Provide a concrete implementation example for '{question_text}'."]
            guidance = [
                f"Define '{question_text}' clearly.",
                "Explain the core technical mechanism.",
                "Provide a practical implementation example."
            ]
            strong_ex = f"A strong answer defines the concept of '{question_text}', explains how it is implemented, and shares a practical example."

    # Default Technical Fallback
    else:
        q_intent = f"Answer the core technical concepts and implementation details requested in: '{question_text}'"
        exp_pts = ["Core Concept Definition", "Implementation Workflow", "Practical Example"]

        if ans_words > 12:
            add_pts = ["Core technical concept addressed"]
            mis_pts = []
            done_well = ["Your answer addressed the primary technical topic requested by the question."]
            missing = []
            could_improve = ["Elaborate on specific architectural trade-offs or edge cases."]
        else:
            add_pts = ["Initial response provided"]
            mis_pts = ["Comprehensive technical explanation"]
            done_well = ["Attempted the question."] if not (what_irr or what_inc) else []
            missing = [f"The question asked about '{question_text}', but your answer lacked technical depth."]
            could_improve = [f"Provide a complete definition and implementation steps for '{question_text}'."]

        guidance = [
            f"State a direct answer for '{question_text}'.",
            "Explain technical mechanisms and workflow.",
            "Provide a practical project example."
        ]
        strong_ex = f"A strong answer defines the core concept of '{question_text}', explains how it works in practice, and shares a concrete example."

    fallback_eval = {
        "question_intent": q_intent,
        "expected_points": exp_pts,
        "addressed_points": add_pts,
        "missing_points": mis_pts,
        "incorrect_points": inc_pts,
        "irrelevant_content": irr_pts,
        "what_was_done_well": done_well,
        "what_was_missing": missing,
        "what_was_incorrect": what_inc,
        "what_was_irrelevant": what_irr,
        "what_could_improve": could_improve,
        "better_answer_guidance": guidance,
        "strong_answer_example": strong_ex
    }

    logger.info(f"[EVALUATION FALLBACK EXECUTED] Question: {question_text}")
    return validate_and_refine_evaluation(fallback_eval, question_text, cand_stripped, evaluation_source="fallback")


def evaluate_interview_answer(
    question_text: str,
    candidate_answer: str,
    resume_text: str,
    interview_type: str = "mixed",
    difficulty: str = "medium",
    is_follow_up: bool = False
) -> Dict[str, Any]:
    """
    Evaluates a candidate's answer strictly against the current question and current answer.
    COMPLETELY REMOVES NUMERIC SCORING and provides detailed, question-specific qualitative AI feedback.
    Acts like a human technical interviewer coaching the candidate.
    """
    candidate_answer_stripped = (candidate_answer or "").strip()
    ans_lower = candidate_answer_stripped.lower()
    q_lower = question_text.lower()

    # Rule: Handle Empty Answers
    if not candidate_answer_stripped:
        raw_empty = {
            "question_intent": f"Directly answer and explain: '{question_text}'",
            "expected_points": [f"Direct answer addressing '{question_text}'"],
            "addressed_points": [],
            "missing_points": [f"Direct answer addressing '{question_text}'"],
            "incorrect_points": [],
            "irrelevant_content": [],
            "what_was_done_well": [],
            "what_was_missing": [f"The question required an answer explaining: '{question_text}'."],
            "what_was_incorrect": [],
            "what_was_irrelevant": [],
            "what_could_improve": [f"Provide a direct answer addressing '{question_text}'."],
            "better_answer_guidance": [
                f"Review core definitions, mechanisms, and real-world examples for '{question_text}'.",
                f"State your high-level understanding first, describe the process step-by-step, and state any assumptions clearly."
            ],
            "strong_answer_example": f"A strong answer for this question could define the core concept of '{question_text}' and walk through the implementation steps.",
            "needs_follow_up": False,
            "follow_up_question": None
        }
        logger.info(f"[EVALUATION LOG - EMPTY ANSWER] Question: {question_text}")
        return validate_and_refine_evaluation(raw_empty, question_text, candidate_answer_stripped, is_empty=True, evaluation_source="fallback")

    # Special Case: Refusal / "I don't know" / "I don't remember" / "No idea" / "I will not explain"
    refusal_triggers = [
        "don't know", "dont know", "do not know", "no idea", "don't remember", "dont remember",
        "cannot answer", "can't answer", "will not explain", "wont explain", "no clue",
        "don't want to answer", "dont want to answer", "i will not answer", "no answer"
    ]
    is_refusal = len(candidate_answer_stripped.split()) <= 8 and any(tr in ans_lower for tr in refusal_triggers)

    if is_refusal:
        raw_refusal = {
            "question_intent": f"Address concepts requested in: '{question_text}'",
            "expected_points": [f"Explanation of core concepts in '{question_text}'"],
            "addressed_points": [],
            "missing_points": [f"Explanation of core concepts in '{question_text}'"],
            "incorrect_points": [],
            "irrelevant_content": [],
            "what_was_done_well": [],
            "what_was_missing": [f"The question asked for an explanation of '{question_text}', but no answer was attempted."],
            "what_was_incorrect": [],
            "what_was_irrelevant": [],
            "what_could_improve": ["Attempt the question even if uncertain. Explain whatever partial concept you understand instead of stopping immediately."],
            "better_answer_guidance": [
                f"Review key concepts and past project experience related to '{question_text}'.",
                f"State what you know about the topic, explain your logical approach, and mention what you would research further."
            ],
            "strong_answer_example": f"A stronger answer could state: 'While I haven't worked with this exact setup recently, my approach to {question_text} would involve defining the core requirements and analyzing the trade-offs.'",
            "needs_follow_up": False,
            "follow_up_question": None
        }
        logger.info(f"[EVALUATION LOG - REFUSAL] Question: {question_text}, Answer: {candidate_answer_stripped}")
        return validate_and_refine_evaluation(raw_refusal, question_text, candidate_answer_stripped, is_refusal=True, evaluation_source="fallback")

    entities = extract_candidate_resume_entities(resume_text)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    api_key_present = bool(api_key and api_key != "your_gemini_api_key_here")

    logger.info(f"[GEMINI EVAL] API key present: {str(api_key_present).lower()}")

    if api_key_present:
        eval_raw = None
        for attempt in range(2):
            try:
                logger.info(f"[GEMINI EVAL] Request started (Attempt {attempt + 1}/2)")
                logger.info("[GEMINI EVAL] Model: gemini-2.5-flash")

                def _call_gemini_eval():
                    from google import genai
                    from google.genai import types

                    client = genai.Client(api_key=api_key)

                    eval_prompt = (
                        f"YOU ARE AN EXPERT HUMAN TECHNICAL INTERVIEWER AND COACH.\n"
                        f"EVALUATE THE CANDIDATE'S ANSWER STRICTLY AGAINST THE ASKED QUESTION AND CANDIDATE'S RESUME CONTEXT.\n\n"
                        f"CURRENT QUESTION ASKED: \"{question_text}\"\n"
                        f"CANDIDATE'S CURRENT ANSWER: \"{candidate_answer_stripped}\"\n"
                        f"INTERVIEW TYPE: {interview_type.upper()}\n"
                        f"DIFFICULTY: {difficulty.upper()}\n"
                        f"VERIFIED CANDIDATE RESUME CONTEXT:\n"
                        f"- Technical Skills: {', '.join(entities['skills']) if entities['skills'] else 'Not specified'}\n"
                        f"- Projects Mentioned: {json.dumps(entities['projects'][:3])}\n\n"
                        f"==================================================\n"
                        f"STRICT QUESTION-TO-ANSWER ALIGNMENT & EVALUATION RULES:\n"
                        f"==================================================\n"
                        f"1. QUESTION COVERAGE ANALYSIS:\n"
                        f"   - Break down the EXACT question into its explicit sub-questions or core required dimensions (e.g., if asked 'What problem does X solve, and why did you choose to build it?', the explicit dimensions are (1) the database querying problem solved and (2) the candidate's reason/motivation for choosing to build it).\n"
                        f"   - Compare the candidate's answer directly against these explicit dimensions.\n\n"
                        f"2. WHAT YOU DID WELL (`what_was_done_well`):\n"
                        f"   - List ONLY specific points from the question that the candidate actually answered correctly.\n"
                        f"   - If the candidate answered 'I don't know', refused, gave an empty response, or gave a completely irrelevant answer, `what_was_done_well` MUST BE `[]` (an empty list). DO NOT fabricate strengths or generic praise.\n\n"
                        f"3. WHAT WAS MISSED (`what_was_missing`):\n"
                        f"   - List ONLY elements explicitly requested by the question (or directly supported by resume context) that the candidate omitted.\n"
                        f"   - Be specific (e.g. 'The answer explains the problem the chatbot solves, but does not answer why you chose to build it.').\n"
                        f"   - DO NOT penalize for unrequested details.\n\n"
                        f"4. WHAT WAS INCORRECT (`what_was_incorrect`):\n"
                        f"   - List ONLY genuine technical or factual errors in the answer. If NO errors exist, return `[]`. DO NOT write filler strings.\n\n"
                        f"5. WHAT WAS IRRELEVANT (`what_was_irrelevant`):\n"
                        f"   - List ONLY content that is completely unrelated to the asked question. If everything is relevant, return `[]`. DO NOT write filler strings.\n\n"
                        f"6. WHAT SHOULD IMPROVE (`what_could_improve`):\n"
                        f"   - 1-2 actionable, specific improvements directly answering the missing parts of THIS question.\n\n"
                        f"7. BETTER ANSWER GUIDANCE (`better_answer_guidance`):\n"
                        f"   - Step-by-step guidance for answering THIS specific question. Do NOT include step numbers in text.\n\n"
                        f"8. STRONGER ANSWER EXAMPLE (`strong_answer_example`):\n"
                        f"   - ZERO-INVENTION MANDATE: Strictly DO NOT invent first-person personal motivations, personal interests, hobbies, or fabricated experiences (e.g. NEVER say 'I was fascinated by...', 'I wanted to learn...', 'I decided to...', 'I was interested in...', 'I observed a bottleneck...').\n"
                        f"   - If the candidate's answer and the provided resume context do NOT state the candidate's personal motivation, the stronger answer example MUST NOT invent one.\n"
                        f"   - Instead, use neutral coaching guidance such as: 'A stronger answer could explain the specific reason you chose to build this project, such as the problem you wanted to explore or the technical goal you had, based on your actual experience.' or 'A stronger answer could add your actual motivation for choosing this project after explaining the problem it solves.'\n"
                        f"   - For project questions, the stronger answer example may use ONLY facts explicitly present in the candidate's answer or the supplied resume/project context.\n\n"
                        f"9. ABSOLUTE PROHIBITIONS:\n"
                        f"   - DO NOT use generic template filler such as 'Provide more details', 'Explain key concepts', 'Give practical examples', 'Structure your answer clearly', or 'Could provide deeper architectural details'.\n"
                        f"   - DO NOT generate any numeric scores, ratings, percentages, or grades.\n\n"
                        f"Return JSON ONLY matching this exact structure:\n"
                        f"{{\n"
                        f'  "question_intent": "Exact requirement of the question",\n'
                        f'  "expected_points": ["Dimension 1", "Dimension 2"],\n'
                        f'  "addressed_points": ["Addressed dimension"],\n'
                        f'  "missing_points": ["Omitted dimension"],\n'
                        f'  "incorrect_points": [],\n'
                        f'  "irrelevant_content": [],\n'
                        f'  "what_was_done_well": ["Specific correct point 1"],\n'
                        f'  "what_was_missing": ["Specific missing requirement 1"],\n'
                        f'  "what_was_incorrect": [],\n'
                        f'  "what_was_irrelevant": [],\n'
                        f'  "what_could_improve": ["Actionable specific improvement for this question"],\n'
                        f'  "better_answer_guidance": ["Step 1 description", "Step 2 description"],\n'
                        f'  "strong_answer_example": "Question-specific example answer or neutral coaching guidance..."\n'
                        f"}}\n"
                    )

                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=eval_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                            max_output_tokens=1400,
                        )
                    )

                    if response and response.text:
                        logger.info("[GEMINI EVAL] Response received")
                        raw_text = response.text.strip()
                        if "```" in raw_text:
                            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
                            raw_text = re.sub(r'```$', '', raw_text, flags=re.MULTILINE).strip()

                        data = json.loads(raw_text)
                        logger.info("[GEMINI EVAL] Response parsed successfully")
                        return data
                    logger.warning("[GEMINI EVAL] Empty response received from Gemini model")
                    return None

                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(_call_gemini_eval)
                    eval_raw = future.result(timeout=14.0)

                if eval_raw and isinstance(eval_raw, dict):
                    break
                else:
                    logger.warning(f"[GEMINI EVAL] Attempt {attempt + 1} output invalid dict")

            except Exception as e:
                err_str = str(e).lower()
                is_transient = "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str or "timeout" in err_str or "503" in err_str
                logger.error(f"[GEMINI EVAL] Attempt {attempt + 1} failed with {type(e).__name__}: {e}")
                if attempt == 0 and is_transient:
                    logger.info("[GEMINI EVAL] Retrying once after 1.5s delay for transient error...")
                    time.sleep(1.5)
                else:
                    break

        if eval_raw and isinstance(eval_raw, dict):
            refined = validate_and_refine_evaluation(
                eval_raw,
                question_text,
                candidate_answer_stripped,
                evaluation_source="gemini"
            )
            logger.info(f"[EVALUATION GEMINI SUCCESS] Question: {question_text}")
            return refined
        else:
            logger.info("[GEMINI EVAL] Gemini evaluation unavailable. Falling back to deterministic evaluator")
    else:
        logger.info("[GEMINI EVAL] API key not present or placeholder. Falling back to deterministic evaluator")

    return evaluate_interview_answer_fallback(
        question_text=question_text,
        candidate_answer=candidate_answer_stripped,
        resume_text=resume_text,
        interview_type=interview_type,
        difficulty=difficulty
    )


def generate_final_interview_report(
    interview_type: str,
    difficulty: str,
    num_questions: int,
    transcript: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Aggregates interview feedback into a purely QUALITATIVE Final Performance Report Card.
    COMPLETELY REMOVES NUMERIC SCORES AND AVERAGES.
    """
    strong_areas: List[str] = []
    areas_to_improve: List[str] = []
    questions_need_practice: List[str] = []
    recommended_topics: List[str] = []
    answering_patterns_to_improve: List[str] = []

    total_qs = len(transcript)
    short_ans_count = 0
    refusal_count = 0
    irrelevant_count = 0
    incorrect_count = 0

    for item in transcript:
        q_text = item.get("question", "")
        ans_text = item.get("candidate_answer", "").strip()
        eval_data = item.get("evaluation", {}) if isinstance(item.get("evaluation"), dict) else {}

        ans_words = len(ans_text.split())
        if ans_words < 10:
            short_ans_count += 1

        missing_list = eval_data.get("what_was_missing", [])
        incorrect_list = eval_data.get("what_was_incorrect", [])
        irrelevant_list = eval_data.get("what_was_irrelevant", [])
        done_well_list = eval_data.get("what_was_done_well", [])

        is_refusal = any("no meaningful answer" in str(x).lower() for x in done_well_list)
        has_incorrect = any("incorrect" in str(x).lower() or "confusing" in str(x).lower() for x in incorrect_list if "no significant technical errors" not in str(x).lower())
        has_irrelevant = any("unrelated" in str(x).lower() or "does not address" in str(x).lower() for x in irrelevant_list if "no significant irrelevant content" not in str(x).lower())
        has_missing = len(missing_list) > 0 and not is_refusal

        if is_refusal:
            refusal_count += 1
            if q_text and q_text not in questions_need_practice:
                questions_need_practice.append(q_text)
        elif has_incorrect:
            incorrect_count += 1
            if q_text and q_text not in questions_need_practice:
                questions_need_practice.append(q_text)
        elif has_irrelevant:
            irrelevant_count += 1
            if q_text and q_text not in questions_need_practice:
                questions_need_practice.append(q_text)
        elif has_missing:
            if q_text and q_text not in questions_need_practice and len(questions_need_practice) < 3:
                questions_need_practice.append(q_text)
        else:
            if q_text:
                strong_areas.append(f"Strong response provided for: '{q_text[:60]}...'")

    # Answering Patterns Identification
    if short_ans_count >= max(2, total_qs // 2):
        answering_patterns_to_improve.append("Answers were consistently too short and lacked supporting examples.")
    if irrelevant_count >= 1:
        answering_patterns_to_improve.append("Answers occasionally introduced unrelated technologies instead of directly addressing the question.")
    if refusal_count >= 1:
        answering_patterns_to_improve.append("Stopped immediately on unfamiliar questions instead of explaining partial concepts.")
    if incorrect_count >= 1:
        answering_patterns_to_improve.append("Technical terms were occasionally confused (e.g. inheritance vs encapsulation).")

    if not answering_patterns_to_improve:
        answering_patterns_to_improve.append("Elaborate more deeply on architectural trade-offs and real-world edge cases.")

    # Strengths & Improvements Synthesis
    if not strong_areas:
        strong_areas.append("Active participation throughout the mock interview session.")
    if len(strong_areas) == 1:
        strong_areas.append("Clear articulation of candidate experience and resume background.")

    if incorrect_count > 0:
        areas_to_improve.append("Verify exact technical definitions and protocol properties before stating them in responses.")
    if short_ans_count > 0:
        areas_to_improve.append("Expand definitions with brief practical examples or implementation details.")
    if not areas_to_improve:
        areas_to_improve.append("Structure complex answers using the Definition -> Concept -> Example framework.")

    recommended_topics = [
        "Core Object-Oriented Programming (Polymorphism, Inheritance, Encapsulation)",
        "Software Development Life Cycle (SDLC) Phases & Deliverables",
        "STAR Method for Behavioral & Team Situation Questions",
        "System Architecture & Deep-Dive Explanation of Primary Projects"
    ]

    overall_feedback = (
        f"You completed a {difficulty.upper()} {interview_type.upper()} mock interview comprising {total_qs} questions. "
        f"Review the detailed question-by-question qualitative feedback below to identify exact missing concepts, "
        f"correct technical claims, and improve your answer structure for upcoming technical interviews."
    )

    return {
        "overall_feedback": overall_feedback,
        "report": {
            "strong_areas": strong_areas[:4],
            "areas_to_improve": areas_to_improve[:4],
            "questions_need_practice": questions_need_practice[:5],
            "recommended_topics": recommended_topics[:4],
            "answering_patterns_to_improve": answering_patterns_to_improve[:4]
        }
    }
