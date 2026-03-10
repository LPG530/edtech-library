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
export type ToolStatus =
  | "approved"
  | "approved_with_restrictions"
  | "pilot_only"
  | "under_review"
  | "denied"
  | "deprecated"
  | "retired";
export type AccessibilityStatus =
  | "review_needed"
  | "vpat_available"
  | "wcag_aa"
  | "partially_compliant"
  | "not_accessible";
export type DataRiskLevel = "low" | "medium" | "high";
export type SsoSupport = "required" | "supported" | "not_supported" | "unknown";

export const availableToolStatuses = [
  "approved",
  "approved_with_restrictions",
  "pilot_only",
] as const;

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
  intended_use: string | null;
  pricing_model: string | null;
  licensing_model: string | null;
  integration_notes: string | null;
  lms_integrations: string[];
  rostering_methods: string[];
  sso_support: SsoSupport;
  requires_district_sso: boolean;
  accessibility_status: AccessibilityStatus;
  accessibility_notes: string | null;
  vpat_url: string | null;
  data_collected: string[];
  data_risk_level: DataRiskLevel;
  privacy_policy_url: string | null;
  terms_of_service_url: string | null;
  dpa_status: DpaStatus;
  dpa_expiration: string | null;
  status: ToolStatus;
  allowed_roles: string[];
  restriction_notes: string | null;
  teacher_guide_url: string | null;
  training_materials_url: string | null;
  district_guidance_url: string | null;
  implementation_notes: string | null;
  use_cases: string[];
  collections: string[];
  featured: boolean;
  next_review_date: string | null;
  review_cycle_months: number | null;
  sunset_date: string | null;
  replacement_tool_id: string | null;
  last_privacy_review_at: string | null;
  last_terms_review_at: string | null;
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
