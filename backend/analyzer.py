import io
import re
import os
import nltk
from typing import Dict, Any, List, Set

# Attempt NLTK data downloads silently
def setup_nltk():
    nltk_data_dir = os.path.join(os.path.expanduser("~"), "nltk_data")
    if not os.path.exists(nltk_data_dir):
        os.makedirs(nltk_data_dir, exist_ok=True)
    
    for resource in ['stopwords', 'punkt', 'wordnet', 'punkt_tab']:
        try:
            nltk.data.find(f'corpora/{resource}' if resource in ['stopwords', 'wordnet'] else f'tokenizers/{resource}')
        except LookupError:
            try:
                nltk.download(resource, quiet=True)
            except Exception:
                pass

setup_nltk()

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pypdf
import docx

# Comprehensive Skill Taxonomy for Keyword Extraction
SKILL_TAXONOMY = {
    # Programming Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust", "ruby", "php",
    "sql", "html", "css", "bash", "shell", "swift", "kotlin", "r", "scala", "dart",
    
    # Web & Frontend Frameworks
    "react", "react.js", "reactjs", "next.js", "nextjs", "vue", "vue.js", "vuejs", "angular", "svelte",
    "redux", "tailwind", "tailwindcss", "bootstrap", "html5", "css3", "graphql", "rest api", "restful api",
    "webpack", "vite", "sass", "less", "jquery", "single page application", "spa",
    
    # Backend & Databases
    "node.js", "nodejs", "express", "express.js", "django", "flask", "fastapi", "spring boot", "spring",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "supabase", "firebase", "sqlite", "orm",
    "prisma", "sequelize", "typeorm", "hibernate", "dynamodb", "elasticsearch",
    
    # AI / ML / Data Science
    "machine learning", "deep learning", "nlp", "natural language processing", "nltk", "spacy",
    "pytorch", "tensorflow", "scikit-learn", "sklearn", "pandas", "numpy", "opencv", "computer vision",
    "llm", "large language models", "tf-idf", "cosine similarity", "data analysis", "data science",
    "neural networks", "bert", "gpt", "huggingface",
    
    # Cloud & DevOps & Infrastructure
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "ci/cd", "github actions", "jenkins", "terraform", "nginx", "linux", "unix", "git", "github",
    "gitlab", "cloud computing", "microservices", "serverless",
    
    # Testing & Architecture & Soft Skills
    "agile", "scrum", "unit testing", "jest", "pytest", "cypress", "playwright", "tdd",
    "test driven development", "system design", "microservices architecture", "oop",
    "object oriented programming", "problem solving", "communication", "team leadership"
}

# Display-friendly skill casing map
SKILL_DISPLAY_MAP = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "c++": "C++",
    "c#": "C#",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "ruby": "Ruby",
    "php": "PHP",
    "sql": "SQL",
    "html": "HTML",
    "css": "CSS",
    "bash": "Bash",
    "shell": "Shell",
    "swift": "Swift",
    "kotlin": "Kotlin",
    "react": "React",
    "react.js": "React",
    "reactjs": "React",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue": "Vue.js",
    "vue.js": "Vue.js",
    "vuejs": "Vue.js",
    "angular": "Angular",
    "svelte": "Svelte",
    "redux": "Redux",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "html5": "HTML5",
    "css3": "CSS3",
    "graphql": "GraphQL",
    "rest api": "REST API",
    "restful api": "RESTful APIs",
    "webpack": "Webpack",
    "vite": "Vite",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "express": "Express.js",
    "express.js": "Express.js",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "spring boot": "Spring Boot",
    "spring": "Spring Framework",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "supabase": "Supabase",
    "firebase": "Firebase",
    "sqlite": "SQLite",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing (NLP)",
    "nltk": "NLTK",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "aws": "AWS",
    "amazon web services": "AWS",
    "azure": "Azure",
    "gcp": "Google Cloud (GCP)",
    "google cloud": "Google Cloud (GCP)",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "ci/cd": "CI/CD Pipelines",
    "github actions": "GitHub Actions",
    "jenkins": "Jenkins",
    "terraform": "Terraform",
    "git": "Git",
    "github": "GitHub",
    "agile": "Agile Methodologies",
    "scrum": "Scrum Framework",
    "unit testing": "Unit Testing",
    "jest": "Jest",
    "pytest": "PyTest",
    "microservices": "Microservices",
    "system design": "System Design"
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from uploaded PDF file bytes."""
    text = ""
    pdf_file = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(pdf_file)
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract plain text from uploaded DOCX file bytes."""
    docx_file = io.BytesIO(file_bytes)
    doc = docx.Document(docx_file)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_document_text(file_bytes: bytes, filename: str) -> str:
    """Extract text based on file extension."""
    lower_name = filename.lower()
    if lower_name.endswith('.pdf'):
        return extract_text_from_pdf(file_bytes)
    elif lower_name.endswith('.docx') or lower_name.endswith('.doc'):
        return extract_text_from_docx(file_bytes)
    else:
        # Fallback to UTF-8 decoding if plain text
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return ""


def preprocess_text(text: str) -> str:
    """Normalize text with lowercasing, stopword removal, and lemmatization."""
    if not text:
        return ""
    
    text = text.lower()
    # Replace non-alphanumeric (keep +, # for C++, C#)
    text = re.sub(r'[^a-z0-9+#\s\-]', ' ', text)
    
    # Basic whitespace cleanup
    tokens = text.split()
    
    try:
        stop_words = set(stopwords.words('english'))
    except Exception:
        stop_words = {"a", "an", "the", "in", "on", "of", "for", "to", "and", "or", "is", "are", "with", "by", "at"}
    
    lemmatizer = WordNetLemmatizer()
    cleaned_tokens = []
    for token in tokens:
        if token not in stop_words and len(token) > 1:
            try:
                lemma = lemmatizer.lemmatize(token)
            except Exception:
                lemma = token
            cleaned_tokens.append(lemma)
            
    return " ".join(cleaned_tokens)


def extract_skills(text: str) -> List[str]:
    """Extract identified skills from text based on taxonomy."""
    if not text:
        return []
    
    normalized_text = " " + text.lower() + " "
    found_skills: Set[str] = set()
    
    for skill_key in SKILL_TAXONOMY:
        # Match exact word/phrase boundary
        pattern = r'(?:\b|_)' + re.escape(skill_key) + r'(?:\b|_)'
        if re.search(pattern, normalized_text):
            display_name = SKILL_DISPLAY_MAP.get(skill_key, skill_key.title())
            found_skills.add(display_name)
            
    return sorted(list(found_skills))


def categorize_missing_skills(missing_skills: List[str], jd_text: str) -> Dict[str, List[str]]:
    """
    Categorizes missing job description skills into Critical, Important, and Nice to Have groups.
    Deterministic and rule-based evaluation based on section context and mention frequency.
    Ensures every missing skill belongs to EXACTLY ONE category.
    """
    if not missing_skills or not jd_text:
        return {
            "critical": [],
            "important": [],
            "nice_to_have": []
        }

    jd_lower = jd_text.lower()
    lines = [line.strip() for line in jd_text.split('\n') if line.strip()]

    # Keywords indicating "Nice to Have" / Preferred sections/lines
    NICE_TO_HAVE_KEYWORDS = {
        "preferred", "nice to have", "bonus", "plus", "desired",
        "optional", "good to have", "plus points", "ideal"
    }

    # Keywords indicating "Critical" / Required sections/lines
    CRITICAL_KEYWORDS = {
        "required", "must", "must-have", "essential", "core", "proficient",
        "minimum", "qualification", "qualifications", "responsibilities",
        "primary", "strong experience", "mandatory", "requirements"
    }

    critical: List[str] = []
    important: List[str] = []
    nice_to_have: List[str] = []

    for display_skill in missing_skills:
        # Find raw matching keys in SKILL_DISPLAY_MAP that map to this display_skill
        matching_keys = [k for k, v in SKILL_DISPLAY_MAP.items() if v.lower() == display_skill.lower()]
        if not matching_keys:
            matching_keys = [display_skill.lower()]

        # Calculate total frequency of skill in JD
        freq = 0
        for mk in matching_keys:
            pattern = r'(?:\b|_)' + re.escape(mk) + r'(?:\b|_)'
            freq += len(re.findall(pattern, jd_lower))

        # Check line contexts where skill appears
        is_in_preferred_line = False
        is_in_required_line = False

        for line in lines:
            line_lower = line.lower()
            contains_skill = any(re.search(r'(?:\b|_)' + re.escape(mk) + r'(?:\b|_)', line_lower) for mk in matching_keys)

            if contains_skill:
                if any(kw in line_lower for kw in NICE_TO_HAVE_KEYWORDS):
                    is_in_preferred_line = True
                if any(kw in line_lower for kw in CRITICAL_KEYWORDS):
                    is_in_required_line = True

        # Rule-based priority decision (exclusive branching guarantee)
        if is_in_preferred_line and not is_in_required_line and freq < 3:
            nice_to_have.append(display_skill)
        elif is_in_required_line or freq >= 2:
            critical.append(display_skill)
        else:
            important.append(display_skill)

    return {
        "critical": sorted(critical),
        "important": sorted(important),
        "nice_to_have": sorted(nice_to_have)
    }


def evaluate_resume_structure(resume_text: str) -> Dict[str, Any]:
    """
    Evaluates extracted resume text structure quality out of 15 max points.
    Evaluates word count length, standard section headers, and quantifiable metrics.
    """
    if not resume_text:
        return {
            "score": 0.0,
            "max": 15.0,
            "word_count_score": 0.0,
            "header_score": 0.0,
            "metrics_score": 0.0,
            "detected_headers": [],
            "metrics_count": 0
        }

    words = resume_text.split()
    word_count = len(words)

    # 1. Word Count Length Score (Max 5.0 pts)
    if 250 <= word_count <= 850:
        word_count_score = 5.0
    elif 150 <= word_count < 250 or 850 < word_count <= 1200:
        word_count_score = 3.5
    elif 100 <= word_count < 150 or 1200 < word_count <= 1600:
        word_count_score = 2.0
    else:
        word_count_score = 1.0

    # 2. Standard Section Headers Detection (Max 6.0 pts, 1.2 pts per header found)
    text_lower = resume_text.lower()
    HEADER_PATTERNS = {
        "Experience": [r'\bexperience\b', r'\bemployment\b', r'\bwork history\b', r'\bwork experience\b'],
        "Education": [r'\beducation\b', r'\bacademic\b', r'\bdegree\b', r'\buniversity\b'],
        "Skills": [r'\bskills\b', r'\btechnologies\b', r'\btechnical skills\b', r'\bcore competencies\b'],
        "Projects": [r'\bprojects\b', r'\bkey projects\b', r'\bportfolio\b'],
        "Summary": [r'\bsummary\b', r'\bprofile\b', r'\bprofessional summary\b', r'\babout\b']
    }

    detected_headers = []
    for header_name, patterns in HEADER_PATTERNS.items():
        if any(re.search(pat, text_lower) for pat in patterns):
            detected_headers.append(header_name)

    header_score = min(6.0, len(detected_headers) * 1.2)

    # 3. Quantifiable Impact Metrics Detection (Max 4.0 pts)
    metric_matches = re.findall(r'\b(?:\d+%\b|\$\d+(?:\.\d+)?|\d+\+\s*(?:years?|projects?|clients?|users?)|\d+x\b|\d+\s*%)', text_lower)
    metrics_count = len(metric_matches)

    if metrics_count >= 3:
        metrics_score = 4.0
    elif metrics_count == 2:
        metrics_score = 3.0
    elif metrics_count == 1:
        metrics_score = 1.5
    else:
        metrics_score = 0.5

    total_structure_score = round(word_count_score + header_score + metrics_score, 1)

    return {
        "score": total_structure_score,
        "max": 15.0,
        "word_count_score": word_count_score,
        "header_score": round(header_score, 1),
        "metrics_score": metrics_score,
        "detected_headers": detected_headers,
        "metrics_count": metrics_count
    }


def calculate_explainable_ats_score(
    matched_skills: List[str],
    missing_skills: List[str],
    categorized_missing: Dict[str, List[str]],
    jd_skills: List[str],
    similarity_score: float,
    resume_text: str
) -> Dict[str, Any]:
    """
    Computes deterministic 4-component ATS breakdown totaling 100 points max:
    1. Keyword & Skill Match (35 pts max)
    2. TF-IDF Cosine Similarity (30 pts max)
    3. Skill Coverage Ratio (20 pts max)
    4. Resume Content & Structure (15 pts max)
    """
    total_jd_count = len(jd_skills)
    critical_missing = categorized_missing.get("critical", [])
    important_missing = categorized_missing.get("important", [])
    nice_missing = categorized_missing.get("nice_to_have", [])

    # 1. Keyword & Skill Match (Max 35.0 pts)
    if total_jd_count > 0:
        missing_penalty = (len(critical_missing) * 1.0) + (len(important_missing) * 0.7) + (len(nice_missing) * 0.4)
        weighted_skill_ratio = max(0.0, (total_jd_count - missing_penalty) / total_jd_count)
        keyword_score = round(weighted_skill_ratio * 35.0, 1)
    else:
        keyword_score = 28.0

    keyword_percentage = round((keyword_score / 35.0) * 100, 1)

    # 2. TF-IDF Cosine Similarity (Max 30.0 pts)
    tfidf_score = round((similarity_score / 100.0) * 30.0, 1)
    tfidf_percentage = round(similarity_score, 1)

    # 3. Skill Coverage Ratio (Max 20.0 pts)
    if total_jd_count > 0:
        coverage_ratio = len(matched_skills) / total_jd_count
    else:
        coverage_ratio = 0.8

    coverage_score = round(coverage_ratio * 20.0, 1)
    coverage_percentage = round(coverage_ratio * 100, 1)

    # 4. Resume Content & Structure (Max 15.0 pts)
    structure_eval = evaluate_resume_structure(resume_text)
    structure_score = structure_eval["score"]
    structure_percentage = round((structure_score / 15.0) * 100, 1)

    # Total ATS Score calculation (Sum of exact 4 components)
    raw_total = round(keyword_score + tfidf_score + coverage_score + structure_score, 1)
    final_ats_score = max(5.0, min(98.0, raw_total))

    # Positive ("What Helped") and Negative ("What Reduced Score") factors
    positive_factors: List[str] = []
    negative_factors: List[str] = []

    if len(matched_skills) > 0:
        positive_factors.append(f"Matched {len(matched_skills)} technical skills required by the job posting.")
    if coverage_percentage >= 70:
        positive_factors.append(f"High skill coverage ratio ({coverage_percentage}% of job skills matched).")
    elif coverage_percentage < 50:
        negative_factors.append(f"Low skill coverage ({coverage_percentage}% of required job skills matched).")

    if critical_missing:
        negative_factors.append(f"Missing {len(critical_missing)} critical required skill(s): {', '.join(critical_missing[:3])}.")

    if important_missing:
        negative_factors.append(f"Missing {len(important_missing)} important role skill(s): {', '.join(important_missing[:3])}.")

    if tfidf_percentage >= 70:
        positive_factors.append(f"High vocabulary and keyword alignment ({tfidf_percentage}% TF-IDF similarity).")
    elif tfidf_percentage < 50:
        negative_factors.append(f"Low TF-IDF text similarity ({tfidf_percentage}%), indicating missing domain terminology.")

    if structure_eval["word_count_score"] == 5.0:
        positive_factors.append(f"Optimal resume length ({len(resume_text.split())} words).")
    elif len(resume_text.split()) < 200:
        negative_factors.append("Resume length is brief (under 200 words).")

    if len(structure_eval["detected_headers"]) >= 4:
        positive_factors.append(f"Well-structured resume sections: {', '.join(structure_eval['detected_headers'])}.")
    elif len(structure_eval["detected_headers"]) < 3:
        negative_factors.append("Missing standard resume section headers (e.g. Education, Projects).")

    if structure_eval["metrics_count"] >= 2:
        positive_factors.append("Includes quantifiable metrics and measurable performance numbers.")
    else:
        negative_factors.append("Lacks quantifiable metrics or measurable bullet points (e.g. %, $).")

    return {
        "total_score": final_ats_score,
        "max_score": 100,
        "formula_explanation": "Overall ATS Score = Keyword Match (35 pts max) + TF-IDF Similarity (30 pts max) + Skill Coverage (20 pts max) + Resume Structure (15 pts max)",
        "components": {
            "keyword_match": {
                "name": "Keyword & Skill Match",
                "score": keyword_score,
                "max": 35.0,
                "percentage": keyword_percentage,
                "description": "Measures presence of required technical keywords weighted by priority (Critical, Important, Nice to Have)."
            },
            "tfidf_similarity": {
                "name": "TF-IDF Vector Similarity",
                "score": tfidf_score,
                "max": 30.0,
                "percentage": tfidf_percentage,
                "description": "Measures vocabulary and contextual similarity between resume and job description using TF-IDF cosine similarity."
            },
            "skill_coverage": {
                "name": "Skill Coverage Ratio",
                "score": coverage_score,
                "max": 20.0,
                "percentage": coverage_percentage,
                "description": "Direct ratio of unique job description skills detected in your resume."
            },
            "resume_structure": {
                "name": "Resume Content & Structure",
                "score": structure_score,
                "max": 15.0,
                "percentage": structure_percentage,
                "description": "Evaluates word count length, section header organization, and quantifiable achievement metrics."
            }
        },
        "positive_factors": positive_factors,
        "negative_factors": negative_factors
    }


def calculate_ats_match(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """
    Computes ATS match score using TF-IDF Cosine Similarity, Skill Coverage, and Explainable Score Breakdown.
    """
    cleaned_resume = preprocess_text(resume_text)
    cleaned_jd = preprocess_text(jd_text)
    
    # 1. TF-IDF Cosine Similarity
    if cleaned_resume and cleaned_jd:
        vectorizer = TfidfVectorizer()
        try:
            tfidf_matrix = vectorizer.fit_transform([cleaned_resume, cleaned_jd])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            similarity_score = round(float(similarity) * 100, 1)
        except Exception:
            similarity_score = 50.0
    else:
        similarity_score = 0.0
        
    # 2. Skill Extraction & Gap Analysis
    jd_skills = extract_skills(jd_text)
    resume_skills = extract_skills(resume_text)
    
    matched_skills = [s for s in jd_skills if s in resume_skills]
    missing_skills = [s for s in jd_skills if s not in resume_skills]

    # Categorize missing skills into Critical, Important, and Nice to Have
    categorized_missing = categorize_missing_skills(missing_skills, jd_text)
    
    if jd_skills:
        skill_match_percentage = round((len(matched_skills) / len(jd_skills)) * 100, 1)
    else:
        skill_match_percentage = 80.0
        
    # 3. Transparent Explainable ATS Score Breakdown Calculation
    ats_breakdown = calculate_explainable_ats_score(
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        categorized_missing=categorized_missing,
        jd_skills=jd_skills,
        similarity_score=similarity_score,
        resume_text=resume_text
    )
    ats_score = ats_breakdown["total_score"]
    
    # 4. Generate AI Optimization Recommendations (Prioritizing Critical missing skills & ATS Score Factors)
    recommendations: List[str] = []

    if categorized_missing["critical"]:
        top_critical = categorized_missing["critical"][:4]
        recommendations.append(
            f"High Priority: Add critical required technical keywords to your resume: {', '.join(top_critical)}."
        )

    if categorized_missing["important"]:
        top_important = categorized_missing["important"][:3]
        recommendations.append(
            f"Medium Priority: Incorporate important role-relevant skills: {', '.join(top_important)}."
        )

    if categorized_missing["nice_to_have"]:
        top_nice = categorized_missing["nice_to_have"][:3]
        recommendations.append(
            f"Bonus Points: Consider adding preferred keywords if applicable: {', '.join(top_nice)}."
        )

    if not missing_skills:
        recommendations.append(
            "Great job! Your resume covers all key skill requirements identified in the job description."
        )
        
    if similarity_score < 70:
        recommendations.append(
            "Align your resume experience descriptions more closely with the specific terminology used in the job posting."
        )

    # Reference structure scoring in recommendations
    if ats_breakdown["components"]["resume_structure"]["score"] < 12.0:
        recommendations.append(
            "Structure Boost: Ensure your resume has standard headers (Experience, Education, Skills, Projects) and quantifiable metrics (%, $)."
        )
        
    if len(resume_text.split()) < 150:
        recommendations.append(
            "Your resume content appears brief. Expand on key project achievements, metrics, and bullet points."
        )
    else:
        recommendations.append(
            "Quantify your accomplishments using action verbs and measurable metrics (e.g. 'Increased accuracy by 25%')."
        )
        
    from optimizer import generate_optimizer_analysis

    partial_analysis = {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "critical_missing_skills": categorized_missing["critical"],
        "important_missing_skills": categorized_missing["important"],
        "nice_to_have_missing_skills": categorized_missing["nice_to_have"],
        "ats_score_breakdown": ats_breakdown,
    }

    optimizer_results = generate_optimizer_analysis(
        analysis_data=partial_analysis,
        resume_text=resume_text,
        jd_text=jd_text
    )

    return {
        "ats_score": ats_score,
        "similarity_score": similarity_score,
        "skill_match_percentage": skill_match_percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "critical_missing_skills": categorized_missing["critical"],
        "important_missing_skills": categorized_missing["important"],
        "nice_to_have_missing_skills": categorized_missing["nice_to_have"],
        "total_jd_skills": len(jd_skills),
        "total_resume_skills": len(resume_skills),
        "recommendations": recommendations,
        "resume_word_count": len(resume_text.split()),
        "jd_word_count": len(jd_text.split()),
        "ats_score_breakdown": ats_breakdown,
        "optimizer_results": optimizer_results
    }


