"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  AccessibilityStatus,
  Category,
  DataRiskLevel,
  DpaStatus,
  SsoSupport,
  Tool,
  ToolStatus,
} from "@/lib/types";

type ToolRecord = Tool & { category?: Category };

type ToolFormState = {
  name: string;
  vendor: string;
  description: string;
  intended_use: string;
  url: string;
  category_id: string;
  status: ToolStatus;
  dpa_status: DpaStatus;
  dpa_expiration: string;
  pricing_model: string;
  licensing_model: string;
  integration_notes: string;
  lms_integrations: string[];
  rostering_methods: string[];
  sso_support: SsoSupport;
  requires_district_sso: boolean;
  accessibility_status: AccessibilityStatus;
  accessibility_notes: string;
  vpat_url: string;
  data_collected: string[];
  data_risk_level: DataRiskLevel;
  privacy_policy_url: string;
  terms_of_service_url: string;
  grade_levels: string[];
  subject_areas: string[];
  allowed_roles: string[];
  restriction_notes: string;
  teacher_guide_url: string;
  training_materials_url: string;
  district_guidance_url: string;
  implementation_notes: string;
  use_cases: string[];
  collections: string[];
  featured: boolean;
  next_review_date: string;
  review_cycle_months: string;
  sunset_date: string;
  replacement_tool_id: string;
  last_privacy_review_at: string;
  last_terms_review_at: string;
  notes: string;
};

const GRADE_OPTIONS = ["K-2", "3-5", "6-8", "9-12"];
const SUBJECT_OPTIONS = [
  "Math",
  "ELA",
  "Science",
  "Social Studies",
  "Art",
  "Music",
  "PE",
  "World Languages",
  "CTE",
  "Special Education",
  "All Subjects",
];
const ROLE_OPTIONS = ["teacher", "student", "admin"];

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "approved_with_restrictions", label: "Approved with Restrictions" },
  { value: "pilot_only", label: "Pilot Only" },
  { value: "under_review", label: "Under Review" },
  { value: "deprecated", label: "Deprecated" },
  { value: "retired", label: "Retired" },
  { value: "denied", label: "Denied" },
];

const DPA_OPTIONS: { value: DpaStatus; label: string }[] = [
  { value: "signed", label: "Signed" },
  { value: "pending", label: "Pending" },
  { value: "not_required", label: "Not Required" },
  { value: "none", label: "None" },
];

const SSO_OPTIONS: { value: SsoSupport; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "supported", label: "Supported" },
  { value: "required", label: "Required" },
  { value: "not_supported", label: "Not Supported" },
];

const ACCESSIBILITY_OPTIONS: { value: AccessibilityStatus; label: string }[] = [
  { value: "review_needed", label: "Review Needed" },
  { value: "vpat_available", label: "VPAT Available" },
  { value: "wcag_aa", label: "WCAG AA Aligned" },
  { value: "partially_compliant", label: "Partially Compliant" },
  { value: "not_accessible", label: "Not Accessible" },
];

const RISK_OPTIONS: { value: DataRiskLevel; label: string }[] = [
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
];

const statusStyles: Record<ToolStatus, string> = {
  approved: "bg-emerald-100 text-emerald-900",
  approved_with_restrictions: "bg-amber-100 text-amber-900",
  pilot_only: "bg-blue-100 text-blue-900",
  under_review: "bg-slate-200 text-slate-900",
  deprecated: "bg-orange-100 text-orange-900",
  retired: "bg-stone-200 text-stone-800",
  denied: "bg-rose-100 text-rose-900",
};

const riskStyles: Record<DataRiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  high: "bg-rose-50 text-rose-800",
};

function emptyForm(categoryId = ""): ToolFormState {
  return {
    name: "",
    vendor: "",
    description: "",
    intended_use: "",
    url: "",
    category_id: categoryId,
    status: "approved",
    dpa_status: "none",
    dpa_expiration: "",
    pricing_model: "",
    licensing_model: "",
    integration_notes: "",
    lms_integrations: [],
    rostering_methods: [],
    sso_support: "unknown",
    requires_district_sso: false,
    accessibility_status: "review_needed",
    accessibility_notes: "",
    vpat_url: "",
    data_collected: [],
    data_risk_level: "medium",
    privacy_policy_url: "",
    terms_of_service_url: "",
    grade_levels: [],
    subject_areas: [],
    allowed_roles: ["teacher"],
    restriction_notes: "",
    teacher_guide_url: "",
    training_materials_url: "",
    district_guidance_url: "",
    implementation_notes: "",
    use_cases: [],
    collections: [],
    featured: false,
    next_review_date: "",
    review_cycle_months: "12",
    sunset_date: "",
    replacement_tool_id: "",
    last_privacy_review_at: "",
    last_terms_review_at: "",
    notes: "",
  };
}

function normalizeList(values: string[] | null | undefined) {
  return (values || []).filter(Boolean);
}

function parseListInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listInputValue(values: string[] | null | undefined) {
  return normalizeList(values).join(", ");
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function toolToForm(tool: ToolRecord): ToolFormState {
  return {
    name: tool.name,
    vendor: tool.vendor || "",
    description: tool.description || "",
    intended_use: tool.intended_use || "",
    url: tool.url || "",
    category_id: tool.category_id || "",
    status: tool.status,
    dpa_status: tool.dpa_status,
    dpa_expiration: tool.dpa_expiration || "",
    pricing_model: tool.pricing_model || "",
    licensing_model: tool.licensing_model || "",
    integration_notes: tool.integration_notes || "",
    lms_integrations: normalizeList(tool.lms_integrations),
    rostering_methods: normalizeList(tool.rostering_methods),
    sso_support: tool.sso_support,
    requires_district_sso: tool.requires_district_sso,
    accessibility_status: tool.accessibility_status,
    accessibility_notes: tool.accessibility_notes || "",
    vpat_url: tool.vpat_url || "",
    data_collected: normalizeList(tool.data_collected),
    data_risk_level: tool.data_risk_level,
    privacy_policy_url: tool.privacy_policy_url || "",
    terms_of_service_url: tool.terms_of_service_url || "",
    grade_levels: normalizeList(tool.grade_levels),
    subject_areas: normalizeList(tool.subject_areas),
    allowed_roles: normalizeList(tool.allowed_roles),
    restriction_notes: tool.restriction_notes || "",
    teacher_guide_url: tool.teacher_guide_url || "",
    training_materials_url: tool.training_materials_url || "",
    district_guidance_url: tool.district_guidance_url || "",
    implementation_notes: tool.implementation_notes || "",
    use_cases: normalizeList(tool.use_cases),
    collections: normalizeList(tool.collections),
    featured: tool.featured,
    next_review_date: tool.next_review_date || "",
    review_cycle_months: tool.review_cycle_months
      ? String(tool.review_cycle_months)
      : "",
    sunset_date: tool.sunset_date || "",
    replacement_tool_id: tool.replacement_tool_id || "",
    last_privacy_review_at: tool.last_privacy_review_at || "",
    last_terms_review_at: tool.last_terms_review_at || "",
    notes: tool.notes || "",
  };
}

export default function ManageToolsPage() {
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [draft, setDraft] = useState<ToolFormState>(emptyForm());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("district_id")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      setDistrictId(profile.district_id);

      const [toolsRes, catsRes] = await Promise.all([
        supabase
          .from("tools")
          .select("*, category:categories(*)")
          .eq("district_id", profile.district_id)
          .order("featured", { ascending: false })
          .order("name"),
        supabase
          .from("categories")
          .select("*")
          .eq("district_id", profile.district_id)
          .order("sort_order"),
      ]);

      const loadedTools = (toolsRes.data || []) as ToolRecord[];
      const loadedCategories = (catsRes.data || []) as Category[];

      setTools(loadedTools);
      setCategories(loadedCategories);

      if (loadedTools.length > 0) {
        setSelectedToolId(loadedTools[0].id);
        setDraft(toolToForm(loadedTools[0]));
      } else {
        setDraft(emptyForm(loadedCategories[0]?.id || ""));
      }

      setLoading(false);
    }

    void load();
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        search === "" ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.vendor?.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase()) ||
        tool.use_cases?.some((value) =>
          value.toLowerCase().includes(search.toLowerCase())
        );
      const matchesStatus =
        statusFilter === "all" || tool.status === statusFilter;
      const matchesRisk =
        riskFilter === "all" || tool.data_risk_level === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [riskFilter, search, statusFilter, tools]);

  const selectedTool = tools.find((tool) => tool.id === selectedToolId) || null;

  const stats = useMemo(() => {
    return {
      total: tools.length,
      available: tools.filter((tool) =>
        ["approved", "approved_with_restrictions", "pilot_only"].includes(tool.status)
      ).length,
      restricted: tools.filter((tool) => tool.status === "approved_with_restrictions")
        .length,
      highRisk: tools.filter((tool) => tool.data_risk_level === "high").length,
      upcomingReviews: tools.filter((tool) => Boolean(tool.next_review_date)).length,
    };
  }, [tools]);

  function startNewProfile() {
    setSelectedToolId(null);
    setDraft(emptyForm(categories[0]?.id || ""));
  }

  function selectTool(tool: ToolRecord) {
    setSelectedToolId(tool.id);
    setDraft(toolToForm(tool));
  }

  function toggleMultiSelect(
    key: "grade_levels" | "subject_areas" | "allowed_roles",
    value: string
  ) {
    setDraft((current) => {
      const currentValues = current[key];
      return {
        ...current,
        [key]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  }

  function setListField(
    key:
      | "lms_integrations"
      | "rostering_methods"
      | "data_collected"
      | "use_cases"
      | "collections",
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [key]: parseListInput(value),
    }));
  }

  async function handleSave() {
    if (!districtId || !draft.name.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const approvedStates = [
      "approved",
      "approved_with_restrictions",
      "pilot_only",
    ] as ToolStatus[];

    const payload = {
      name: draft.name.trim(),
      vendor: draft.vendor || null,
      description: draft.description || null,
      intended_use: draft.intended_use || null,
      url: draft.url || null,
      category_id: draft.category_id || null,
      status: draft.status,
      dpa_status: draft.dpa_status,
      dpa_expiration: draft.dpa_expiration || null,
      pricing_model: draft.pricing_model || null,
      licensing_model: draft.licensing_model || null,
      integration_notes: draft.integration_notes || null,
      lms_integrations: draft.lms_integrations,
      rostering_methods: draft.rostering_methods,
      sso_support: draft.sso_support,
      requires_district_sso: draft.requires_district_sso,
      accessibility_status: draft.accessibility_status,
      accessibility_notes: draft.accessibility_notes || null,
      vpat_url: draft.vpat_url || null,
      data_collected: draft.data_collected,
      data_risk_level: draft.data_risk_level,
      privacy_policy_url: draft.privacy_policy_url || null,
      terms_of_service_url: draft.terms_of_service_url || null,
      grade_levels: draft.grade_levels,
      subject_areas: draft.subject_areas,
      allowed_roles: draft.allowed_roles,
      restriction_notes: draft.restriction_notes || null,
      teacher_guide_url: draft.teacher_guide_url || null,
      training_materials_url: draft.training_materials_url || null,
      district_guidance_url: draft.district_guidance_url || null,
      implementation_notes: draft.implementation_notes || null,
      use_cases: draft.use_cases,
      collections: draft.collections,
      featured: draft.featured,
      next_review_date: draft.next_review_date || null,
      review_cycle_months: draft.review_cycle_months
        ? Number(draft.review_cycle_months)
        : null,
      sunset_date: draft.sunset_date || null,
      replacement_tool_id: draft.replacement_tool_id || null,
      last_privacy_review_at: draft.last_privacy_review_at || null,
      last_terms_review_at: draft.last_terms_review_at || null,
      notes: draft.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (selectedToolId) {
      const { data, error } = await supabase
        .from("tools")
        .update(payload)
        .eq("id", selectedToolId)
        .select("*, category:categories(*)")
        .single();

      if (error) {
        console.error("Error updating tool:", error);
      } else if (data) {
        setTools((current) =>
          current
            .map((tool) => (tool.id === data.id ? (data as ToolRecord) : tool))
            .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
        );
        setDraft(toolToForm(data as ToolRecord));
      }
    } else {
      const { data, error } = await supabase
        .from("tools")
        .insert({
          district_id: districtId,
          ...payload,
          approved_at: approvedStates.includes(draft.status)
            ? new Date().toISOString()
            : null,
          approved_by: approvedStates.includes(draft.status) ? user?.id || null : null,
        })
        .select("*, category:categories(*)")
        .single();

      if (error) {
        console.error("Error creating tool:", error);
      } else if (data) {
        setTools((current) =>
          [...current, data as ToolRecord].sort(
            (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)
          )
        );
        setSelectedToolId((data as ToolRecord).id);
        setDraft(toolToForm(data as ToolRecord));
      }
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedToolId) return;
    const confirmed = window.confirm(
      "Remove this tool profile from the district library?"
    );
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("tools").delete().eq("id", selectedToolId);

    const remaining = tools.filter((tool) => tool.id !== selectedToolId);
    setTools(remaining);
    if (remaining.length > 0) {
      setSelectedToolId(remaining[0].id);
      setDraft(toolToForm(remaining[0]));
    } else {
      setSelectedToolId(null);
      setDraft(emptyForm(categories[0]?.id || ""));
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tool Library</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted mb-2">
            Tool Portfolio
          </p>
          <h1 className="text-3xl font-semibold mb-2">Tool library and profiles</h1>
          <p className="text-muted max-w-3xl">
            Manage tool profiles as operational records, not just catalog rows.
            This workspace combines governance state, compliance metadata,
            teacher-facing documentation, and lifecycle planning.
          </p>
        </div>
        <button
          onClick={startNewProfile}
          className="px-4 py-2.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          New tool profile
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Total profiles</p>
          <p className="text-3xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Available to educators</p>
          <p className="text-3xl font-semibold">{stats.available}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Restricted approvals</p>
          <p className="text-3xl font-semibold">{stats.restricted}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">High-risk tools</p>
          <p className="text-3xl font-semibold">{stats.highRisk}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Scheduled reviews</p>
          <p className="text-3xl font-semibold">{stats.upcomingReviews}</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tool, vendor, or use case"
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="px-3 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All risks</option>
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">District portfolio</h2>
              <p className="text-sm text-muted mt-1">
                {filteredTools.length} matching tool
                {filteredTools.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
              {filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => selectTool(tool)}
                  className={`w-full text-left px-5 py-4 border-b border-border last:border-0 transition-colors ${
                    tool.id === selectedToolId
                      ? "bg-blue-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{tool.name}</p>
                      <p className="text-sm text-muted mt-1">
                        {tool.vendor || "Vendor not recorded"}
                      </p>
                    </div>
                    {tool.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[tool.status]}`}
                    >
                      {STATUS_OPTIONS.find((option) => option.value === tool.status)?.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskStyles[tool.data_risk_level]}`}
                    >
                      {RISK_OPTIONS.find((option) => option.value === tool.data_risk_level)?.label}
                    </span>
                  </div>
                </button>
              ))}
              {filteredTools.length === 0 && (
                <div className="px-5 py-10 text-sm text-muted text-center">
                  No tools match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted mb-2">
                  {selectedTool ? "Editing profile" : "New profile"}
                </p>
                <h2 className="text-2xl font-semibold">
                  {selectedTool ? selectedTool.name : "Create a district tool record"}
                </h2>
                <p className="text-sm text-muted mt-1">
                  Capture the information teachers, coordinators, and legal/compliance
                  reviewers all need in one place.
                </p>
              </div>
              {selectedTool && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Profile</h3>
                  <p className="text-sm text-muted">
                    Core educator-facing metadata and discovery details.
                  </p>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Tool name</span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Vendor</span>
                    <input
                      type="text"
                      value={draft.vendor}
                      onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">Description</span>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">Intended use</span>
                    <textarea
                      rows={2}
                      value={draft.intended_use}
                      onChange={(e) => setDraft({ ...draft, intended_use: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="What teaching or operational problem does this tool solve?"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Primary URL</span>
                    <input
                      type="url"
                      value={draft.url}
                      onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Category</span>
                    <select
                      value={draft.category_id}
                      onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Grade levels</p>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_OPTIONS.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleMultiSelect("grade_levels", grade)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          draft.grade_levels.includes(grade)
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-muted border-border"
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleMultiSelect("subject_areas", subject)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          draft.subject_areas.includes(subject)
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-muted border-border"
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Use cases</span>
                    <input
                      type="text"
                      value={listInputValue(draft.use_cases)}
                      onChange={(e) => setListField("use_cases", e.target.value)}
                      placeholder="assessment, writing feedback, family communication"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Collections</span>
                    <input
                      type="text"
                      value={listInputValue(draft.collections)}
                      onChange={(e) => setListField("collections", e.target.value)}
                      placeholder="district favorites, literacy stack"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Governance and compliance</h3>
                  <p className="text-sm text-muted">
                    Approval state, access boundaries, privacy posture, and required artifacts.
                  </p>
                </div>
                <div className="grid lg:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Status</span>
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft({ ...draft, status: e.target.value as ToolStatus })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">DPA status</span>
                    <select
                      value={draft.dpa_status}
                      onChange={(e) =>
                        setDraft({ ...draft, dpa_status: e.target.value as DpaStatus })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {DPA_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Data risk</span>
                    <select
                      value={draft.data_risk_level}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          data_risk_level: e.target.value as DataRiskLevel,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {RISK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">DPA expiration</span>
                    <input
                      type="date"
                      value={draft.dpa_expiration}
                      onChange={(e) =>
                        setDraft({ ...draft, dpa_expiration: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Accessibility</span>
                    <select
                      value={draft.accessibility_status}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          accessibility_status: e.target.value as AccessibilityStatus,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {ACCESSIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">VPAT URL</span>
                    <input
                      type="url"
                      value={draft.vpat_url}
                      onChange={(e) => setDraft({ ...draft, vpat_url: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-3">
                    <span className="block text-sm font-medium mb-1">Data collected</span>
                    <input
                      type="text"
                      value={listInputValue(draft.data_collected)}
                      onChange={(e) => setListField("data_collected", e.target.value)}
                      placeholder="name, email, roster data, assessment responses"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-3">
                    <span className="block text-sm font-medium mb-1">Restriction notes</span>
                    <textarea
                      rows={2}
                      value={draft.restriction_notes}
                      onChange={(e) =>
                        setDraft({ ...draft, restriction_notes: e.target.value })
                      }
                      placeholder="Example: limited to grades 9-12, staff-led use only, not approved for parent messaging."
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Allowed roles</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleMultiSelect("allowed_roles", role)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          draft.allowed_roles.includes(role)
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-muted border-border"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Integrations and enablement</h3>
                  <p className="text-sm text-muted">
                    Technical fit, implementation requirements, and teacher-facing support.
                  </p>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Pricing model</span>
                    <input
                      type="text"
                      value={draft.pricing_model}
                      onChange={(e) =>
                        setDraft({ ...draft, pricing_model: e.target.value })
                      }
                      placeholder="Free, site license, per student"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Licensing model</span>
                    <input
                      type="text"
                      value={draft.licensing_model}
                      onChange={(e) =>
                        setDraft({ ...draft, licensing_model: e.target.value })
                      }
                      placeholder="Districtwide, department-funded, pilot grant"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">SSO support</span>
                    <select
                      value={draft.sso_support}
                      onChange={(e) =>
                        setDraft({ ...draft, sso_support: e.target.value as SsoSupport })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {SSO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={draft.requires_district_sso}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          requires_district_sso: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium">Requires district login / SSO</span>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">LMS integrations</span>
                    <input
                      type="text"
                      value={listInputValue(draft.lms_integrations)}
                      onChange={(e) =>
                        setListField("lms_integrations", e.target.value)
                      }
                      placeholder="Canvas, Google Classroom, Schoology"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Rostering methods</span>
                    <input
                      type="text"
                      value={listInputValue(draft.rostering_methods)}
                      onChange={(e) =>
                        setListField("rostering_methods", e.target.value)
                      }
                      placeholder="Clever, ClassLink, CSV sync"
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">Integration notes</span>
                    <textarea
                      rows={2}
                      value={draft.integration_notes}
                      onChange={(e) =>
                        setDraft({ ...draft, integration_notes: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Teacher guide URL</span>
                    <input
                      type="url"
                      value={draft.teacher_guide_url}
                      onChange={(e) =>
                        setDraft({ ...draft, teacher_guide_url: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Training materials URL</span>
                    <input
                      type="url"
                      value={draft.training_materials_url}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          training_materials_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">District-specific guidance URL</span>
                    <input
                      type="url"
                      value={draft.district_guidance_url}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          district_guidance_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">Implementation notes</span>
                    <textarea
                      rows={2}
                      value={draft.implementation_notes}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          implementation_notes: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Lifecycle and review</h3>
                  <p className="text-sm text-muted">
                    Review cadence, phase-out planning, and legal monitoring.
                  </p>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) =>
                        setDraft({ ...draft, featured: e.target.checked })
                      }
                    />
                    <span className="text-sm font-medium">Highlight as district favorite</span>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Review cycle (months)</span>
                    <input
                      type="number"
                      min="1"
                      value={draft.review_cycle_months}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          review_cycle_months: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Next review date</span>
                    <input
                      type="date"
                      value={draft.next_review_date}
                      onChange={(e) =>
                        setDraft({ ...draft, next_review_date: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Sunset date</span>
                    <input
                      type="date"
                      value={draft.sunset_date}
                      onChange={(e) =>
                        setDraft({ ...draft, sunset_date: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Replacement tool</span>
                    <select
                      value={draft.replacement_tool_id}
                      onChange={(e) =>
                        setDraft({ ...draft, replacement_tool_id: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">No replacement selected</option>
                      {tools
                        .filter((tool) => tool.id !== selectedToolId)
                        .map((tool) => (
                          <option key={tool.id} value={tool.id}>
                            {tool.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Last privacy review</span>
                    <input
                      type="date"
                      value={draft.last_privacy_review_at}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          last_privacy_review_at: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Last terms review</span>
                    <input
                      type="date"
                      value={draft.last_terms_review_at}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          last_terms_review_at: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Privacy policy URL</span>
                    <input
                      type="url"
                      value={draft.privacy_policy_url}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          privacy_policy_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Terms of service URL</span>
                    <input
                      type="url"
                      value={draft.terms_of_service_url}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          terms_of_service_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="block text-sm font-medium mb-1">Internal notes</span>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                className="px-4 py-2.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : selectedTool ? "Save changes" : "Create tool profile"}
              </button>
              <button
                onClick={() =>
                  selectedTool
                    ? setDraft(toolToForm(selectedTool))
                    : setDraft(emptyForm(categories[0]?.id || ""))
                }
                className="px-4 py-2.5 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Reset form
              </button>
            </div>
          </div>

          {selectedTool && (
            <div className="bg-white border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Profile summary</h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-muted mb-1">Approval state</p>
                  <p className="font-medium">
                    {STATUS_OPTIONS.find((option) => option.value === selectedTool.status)?.label}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-muted mb-1">Data risk</p>
                  <p className="font-medium">
                    {RISK_OPTIONS.find((option) => option.value === selectedTool.data_risk_level)?.label}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-muted mb-1">Next review</p>
                  <p className="font-medium">{formatDate(selectedTool.next_review_date)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-muted mb-1">DPA expiration</p>
                  <p className="font-medium">{formatDate(selectedTool.dpa_expiration)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
