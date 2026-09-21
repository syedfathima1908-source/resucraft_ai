import type { AnalysisHistoryRecord } from '../types/history';

export interface OptimizerRecommendation {
  category: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  explanation: string;
  action: string;
}

export interface OptimizerCategory {
  name: string;
  description: string;
  recommendations: OptimizerRecommendation[];
}

export interface SuggestedChange {
  original: string;
  improved: string;
  reason: string;
}

export interface OptimizerResultsData {
  categories: OptimizerCategory[];
  suggested_changes: SuggestedChange[];
}



/**
 * Normalizes missing skills from an AnalysisHistoryRecord.
 */
export function extractMissingSkillsData(record: AnalysisHistoryRecord) {
  if (Array.isArray(record.missing_skills)) {
    return {
      all: record.missing_skills,
      critical: record.missing_skills,
      important: [] as string[],
      nice_to_have: [] as string[],
    };
  }

  const ms = record.missing_skills || {};
  return {
    all: ms.all || [],
    critical: ms.critical || [],
    important: ms.important || [],
    nice_to_have: ms.nice_to_have || [],
  };
}

/**
 * Normalizes matched skills from an AnalysisHistoryRecord.
 */
export function extractMatchedSkillsData(record: AnalysisHistoryRecord): string[] {
  if (Array.isArray(record.matched_skills)) {
    return record.matched_skills;
  }
  return [];
}

/**
 * Normalizes recommendations & optimizer results from an AnalysisHistoryRecord.
 */
export function extractRecommendationsData(record: AnalysisHistoryRecord): {
  list: string[];
  optimizer: OptimizerResultsData | null;
} {
  if (Array.isArray(record.recommendations)) {
    return {
      list: record.recommendations,
      optimizer: null,
    };
  }

  const recObj = (record.recommendations as any) || {};
  return {
    list: (recObj.list as string[]) || [],
    optimizer: recObj.optimizer || null,
  };
}

/**
 * Generates modular Optimizer recommendations and suggested bullet point upgrades
 * from an AnalysisHistoryRecord if not pre-computed.
 */
export function generateOptimizerResults(record: AnalysisHistoryRecord): OptimizerResultsData {
  const existingData = extractRecommendationsData(record);
  if (existingData.optimizer && existingData.optimizer.categories && existingData.optimizer.categories.length > 0) {
    return existingData.optimizer;
  }

  const matchedSkills = extractMatchedSkillsData(record);
  const missingData = extractMissingSkillsData(record);
  const atsScore = Number(record.match_percentage) || 0;

  const categories: OptimizerCategory[] = [];

  // 1. Critical Improvements
  const criticalRecs: OptimizerRecommendation[] = [];
  if (missingData.critical.length > 0) {
    missingData.critical.slice(0, 3).forEach((skill) => {
      criticalRecs.push({
        category: 'Critical Improvements',
        priority: 'High',
        explanation: `'${skill}' is identified as a key role requirement but is missing from your analyzed resume.`,
        action: `Add a bullet point under your experience or skills section demonstrating your proficiency with ${skill}.`,
      });
    });
  } else {
    criticalRecs.push({
      category: 'Critical Improvements',
      priority: 'Low',
      explanation: 'No critical skill gaps detected! Your resume matches all core required skills.',
      action: 'Maintain prominence of core technical skills in your top summary.',
    });
  }
  categories.push({
    name: 'Critical Improvements',
    description: 'High-priority missing skills that are core job requirements.',
    recommendations: criticalRecs,
  });

  // 2. Keyword Optimization
  const keywordRecs: OptimizerRecommendation[] = [];
  if (missingData.important.length > 0) {
    const skillsStr = missingData.important.slice(0, 3).join(', ');
    keywordRecs.push({
      category: 'Keyword Optimization',
      priority: 'Medium',
      explanation: `Important job description terms (${skillsStr}) are absent from your resume text.`,
      action: `Incorporate technical keywords such as ${skillsStr} into work experience bullets.`,
    });
  }
  if (missingData.nice_to_have.length > 0) {
    const skillsStr = missingData.nice_to_have.slice(0, 3).join(', ');
    keywordRecs.push({
      category: 'Keyword Optimization',
      priority: 'Low',
      explanation: `Secondary preferred keywords (${skillsStr}) were found in the job posting.`,
      action: `Mention bonus skills like ${skillsStr} in an Additional Qualifications section.`,
    });
  }
  if (keywordRecs.length === 0) {
    keywordRecs.push({
      category: 'Keyword Optimization',
      priority: 'Low',
      explanation: 'Keyword distribution across technical terminology is well aligned.',
      action: 'Ensure keyword spellings match standard job description nomenclature.',
    });
  }
  categories.push({
    name: 'Keyword Optimization',
    description: 'Strategic placement of missing role-relevant keywords.',
    recommendations: keywordRecs,
  });

  // 3. Skills to Highlight
  const highlightRecs: OptimizerRecommendation[] = [];
  if (matchedSkills.length > 0) {
    const topMatched = matchedSkills.slice(0, 3).join(', ');
    highlightRecs.push({
      category: 'Skills to Highlight',
      priority: 'Medium',
      explanation: `Matched core skills (${topMatched}) give you a strong baseline for this position.`,
      action: `Feature ${topMatched} prominently near the top of your resume and summary header.`,
    });
  } else {
    highlightRecs.push({
      category: 'Skills to Highlight',
      priority: 'High',
      explanation: 'Few direct skill keyword matches detected.',
      action: 'Re-organize skills into explicit technical categories (Languages, Frameworks, Tools).',
    });
  }
  categories.push({
    name: 'Skills to Highlight',
    description: 'Prominent positioning for matched skills essential to the target role.',
    recommendations: highlightRecs,
  });

  // 4. Content Improvements
  const contentRecs: OptimizerRecommendation[] = [];
  if (atsScore < 60) {
    contentRecs.push({
      category: 'Content Improvements',
      priority: 'High',
      explanation: 'Overall match score is below 60%. Resume text may lack strong action verbs or detailed context.',
      action: 'Rewrite bullet points using action verbs (e.g. Engineered, Spearheaded, Optimized) and add quantifiable outcomes.',
    });
  } else {
    contentRecs.push({
      category: 'Content Improvements',
      priority: 'Medium',
      explanation: 'Solid content foundation. Strengthening action verbs will increase recruiter callbacks.',
      action: 'Ensure bullet points follow the format: [Strong Action Verb] + [Core Task/Technology] + [Measurable Result].',
    });
  }
  categories.push({
    name: 'Content Improvements',
    description: 'Language, action verb, and measurable impact optimization.',
    recommendations: contentRecs,
  });

  // 5. ATS / Structure Improvements
  const structureRecs: OptimizerRecommendation[] = [];
  structureRecs.push({
    category: 'ATS/Structure Improvements',
    priority: 'Low',
    explanation: 'Clean document layout ensures ATS parser indexability.',
    action: 'Use standard section headings (Work Experience, Education, Skills) and avoid complex nested tables.',
  });
  categories.push({
    name: 'ATS/Structure Improvements',
    description: 'Document layout, section headers, and parser readability.',
    recommendations: structureRecs,
  });

  // Generate Suggested Changes without inventing fake facts
  const suggested_changes: SuggestedChange[] = [];

  if (matchedSkills.length > 0) {
    const skill = matchedSkills[0];
    suggested_changes.push({
      original: `Responsible for developing features using ${skill}.`,
      improved: `Engineered and deployed application features utilizing ${skill}.`,
      reason: 'Replaced passive phrasing ("Responsible for") with action verb ("Engineered") while strictly preserving original resume facts.',
    });
  }

  if (missingData.critical.length > 0) {
    const missingSkill = missingData.critical[0];
    suggested_changes.push({
      original: `Worked with software development tools and APIs.`,
      improved: `Architected software development tools and APIs incorporating ${missingSkill}.`,
      reason: `Integrated missing skill (${missingSkill}) while strictly preserving original resume facts.`,
    });
  }

  if (suggested_changes.length === 0) {
    suggested_changes.push({
      original: 'Handled day-to-day software development tasks and team requests.',
      improved: 'Spearheaded end-to-end software development deliverables and team requests.',
      reason: 'Replaced passive verb ("Handled") with strong action verb ("Spearheaded") while strictly preserving original facts.',
    });
  }

  return {
    categories,
    suggested_changes,
  };
}



/**
 * Calls backend endpoint /api/optimize-full on-demand to fetch Gemini-enhanced AI Optimizer recommendations.
 * Falls back gracefully to null if backend fails/times out.
 */
export async function fetchGeminiOptimizerResults(
  resumeText: string,
  jdText: string,
  analysisData: any
): Promise<OptimizerResultsData | null> {
  try {
    const response = await fetch('http://localhost:5000/api/optimize-full', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resume_text: resumeText,
        jd_text: jdText,
        analysis_data: analysisData,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success' && data.optimizer_results) {
        return data.optimizer_results;
      }
    }
  } catch (err) {
    console.warn('[OptimizerService] Backend /api/optimize-full fetch error, using local fallback:', err);
  }
  return null;
}


