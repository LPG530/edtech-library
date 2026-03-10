export type District = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
};

export type UserRole = "admin" | "reviewer" | "staff";

export type User = {
  id: string;
  district_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type Category = {
  id: string;
  district_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type DpaStatus = "signed" | "pending" | "not_required" | "none";
export type ToolStatus = "approved" | "under_review" | "denied" | "retired";

export type Tool = {
  id: string;
  district_id: string;
  name: string;
  vendor: string | null;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  category_id: string | null;
  grade_levels: string[];
  subject_areas: string[];
  dpa_status: DpaStatus;
  dpa_expiration: string | null;
  status: ToolStatus;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type RubricTemplate = {
  id: string;
  district_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: RubricCategory[];
};

export type RubricCategory = {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  weight: number;
  sort_order: number;
  criteria?: RubricCriterion[];
};

export type ScoreType = "scale" | "yes_no" | "met_partial_not";

export type RubricCriterion = {
  id: string;
  category_id: string;
  prompt: string;
  description: string | null;
  score_type: ScoreType;
  max_score: number;
  sort_order: number;
};

export type RequestStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "denied"
  | "more_info_needed";

export type ToolRequest = {
  id: string;
  district_id: string;
  requested_by: string;
  tool_name: string;
  vendor: string | null;
  url: string | null;
  description: string | null;
  justification: string;
  grade_levels: string[];
  subject_areas: string[];
  student_data_involved: string | null;
  estimated_cost: string | null;
  alternatives_considered: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  requester?: User;
  evaluations?: RubricEvaluation[];
  review_actions?: ReviewAction[];
};

export type RubricEvaluation = {
  id: string;
  request_id: string;
  template_id: string;
  evaluator_id: string;
  evaluator_role: "requester" | "reviewer";
  total_score: number | null;
  total_possible: number | null;
  percentage: number | null;
  completed_at: string | null;
  created_at: string;
  scores?: RubricScore[];
};

export type RubricScore = {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  notes: string | null;
};

export type ReviewAction = {
  id: string;
  request_id: string;
  reviewer_id: string;
  action: "assigned" | "approved" | "denied" | "requested_info" | "comment";
  comment: string | null;
  created_at: string;
  reviewer?: User;
};
