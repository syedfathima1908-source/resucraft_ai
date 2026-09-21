export interface AnalysisHistoryRecord {
  id: string;
  user_id: string;
  resume_filename: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills:
    | string[]
    | {
        all?: string[];
        critical?: string[];
        important?: string[];
        nice_to_have?: string[];
        [key: string]: any;
      };
  recommendations:
    | string[]
    | {
        list?: string[];
        optimizer?: any;
        [key: string]: any;
      };
  resume_skills:
    | {
        total?: number;
        skills?: string[];
        [key: string]: any;
      }
    | string[];
  job_description_skills:
    | {
        total?: number;
        skills?: string[];
        [key: string]: any;
      }
    | string[];
  raw_resume_text?: string | null;
  created_at: string;
}
