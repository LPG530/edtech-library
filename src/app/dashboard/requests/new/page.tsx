"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GlobalTool } from "@/lib/types";

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

const SCORE_LABELS: Record<number, string> = {
  1: "Does not meet",
  2: "Partially meets",
  3: "Meets",
  4: "Exceeds",
};

type RubricCriterion = {
  id: string;
  prompt: string;
  description: string;
  score_type: string;
  max_score: number;
  sort_order: number;
};

type RubricCategoryWithCriteria = {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: RubricCriterion[];
};

type TemplateOption = {
  id: string;
  name: string;
};

type GlobalToolOption = Pick<
  GlobalTool,
  | "id"
  | "canonical_name"
  | "vendor"
  | "description"
  | "website_url"
  | "grade_levels"
  | "subject_areas"
  | "district_adoption_count"
  | "request_count"
>;

function parseCats(cats: Record<string, unknown>[]): RubricCategoryWithCriteria[] {
  return cats.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: (c.description as string) || "",
    weight: Number(c.weight),
    criteria: ((c.criteria as Record<string, unknown>[]) || [])
      .map((cr) => ({
        id: cr.id as string,
        prompt: cr.prompt as string,
        description: (cr.description as string) || "",
        score_type: cr.score_type as string,
        max_score: (cr.max_score as number) || 4,
        sort_order: (cr.sort_order as number) || 0,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "rubric" | "review">("info");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Rubric template selection
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [rubricCategories, setRubricCategories] = useState<RubricCategoryWithCriteria[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [globalTools, setGlobalTools] = useState<GlobalToolOption[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedGlobalTool, setSelectedGlobalTool] =
    useState<GlobalToolOption | null>(null);

  // Form state
  const [form, setForm] = useState({
    tool_name: "",
    vendor: "",
    url: "",
    description: "",
    justification: "",
    student_data_involved: "",
    estimated_cost: "",
    alternatives_considered: "",
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  async function loadRubricForTemplate(templateId: string) {
    const supabase = createClient();
    const { data: cats } = await supabase
      .from("rubric_categories")
      .select("*, criteria:rubric_criteria(*)")
      .eq("template_id", templateId)
      .order("sort_order");

    if (cats) {
      setRubricCategories(parseCats(cats));
      setScores({});
    }
  }

  useEffect(() => {
    async function loadTemplates() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("district_id")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      setDistrictId(profile.district_id);

      const { data: templateRows } = await supabase
        .from("rubric_templates")
        .select("id, name")
        .eq("district_id", profile.district_id)
        .eq("is_active", true)
        .order("created_at");

      const { data: globalToolRows } = await supabase
        .from("global_tools")
        .select(
          "id, canonical_name, vendor, description, website_url, grade_levels, subject_areas, district_adoption_count, request_count"
        )
        .order("district_adoption_count", { ascending: false })
        .order("request_count", { ascending: false })
        .limit(150);

      if (templateRows && templateRows.length > 0) {
        setTemplates(templateRows);
        setSelectedTemplateId(templateRows[0].id);
        await loadRubricForTemplate(templateRows[0].id);
      }

      if (globalToolRows) {
        setGlobalTools(globalToolRows as GlobalToolOption[]);
      }

      setLoading(false);
    }
    loadTemplates();
  }, []);

  async function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    await loadRubricForTemplate(templateId);
  }

  function toggleGrade(grade: string) {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  }

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  function setScore(criterionId: string, score: number) {
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  }

  const totalCriteria = rubricCategories.flatMap((c) => c.criteria).length;
  const scoredCriteria = Object.keys(scores).length;
  const filteredGlobalTools = globalTools
    .filter((tool) => {
      if (globalSearch.trim() === "") return true;
      const query = globalSearch.toLowerCase();
      return (
        tool.canonical_name.toLowerCase().includes(query) ||
        tool.vendor?.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query)
      );
    })
    .slice(0, globalSearch.trim() === "" ? 8 : 6);

  function selectGlobalTool(tool: GlobalToolOption) {
    setSelectedGlobalTool(tool);
    setGlobalSearch(tool.canonical_name);
    setForm((current) => ({
      ...current,
      tool_name: tool.canonical_name,
      vendor: tool.vendor || "",
      url: tool.website_url || "",
      description: tool.description || current.description,
    }));
    setSelectedGrades(tool.grade_levels || []);
    setSelectedSubjects(tool.subject_areas || []);
  }

  function clearGlobalToolSelection() {
    setSelectedGlobalTool(null);
    setGlobalSearch("");
  }

  const weightedScore = rubricCategories.reduce((total, category) => {
    const categoryMax = category.criteria.length * 4;
    const categoryScore = category.criteria.reduce(
      (sum, c) => sum + (scores[c.id] || 0),
      0
    );
    const categoryPercentage = categoryMax > 0 ? categoryScore / categoryMax : 0;
    return total + categoryPercentage * category.weight;
  }, 0);

  async function handleSubmit() {
    if (!form.tool_name || !form.justification || !districtId) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    let globalToolId = selectedGlobalTool?.id || null;
    let globalToolError: { message?: string } | null = null;

    if (!globalToolId) {
      const response = await supabase.rpc("upsert_global_tool", {
        p_name: form.tool_name,
        p_vendor: form.vendor || null,
        p_website_url: form.url || null,
        p_description: form.description || null,
        p_grade_levels: selectedGrades,
        p_subject_areas: selectedSubjects,
      });

      globalToolId = response.data;
      globalToolError = response.error;
    }

    if (globalToolError || !globalToolId) {
      console.error("Error linking global tool:", globalToolError);
      setSubmitting(false);
      return;
    }

    // Create the request
    const { data: request, error } = await supabase
      .from("tool_requests")
      .insert({
        district_id: districtId,
        global_tool_id: globalToolId,
        requested_by: user.id,
        tool_name: form.tool_name,
        vendor: form.vendor || null,
        url: form.url || null,
        description: form.description || null,
        justification: form.justification,
        grade_levels: selectedGrades,
        subject_areas: selectedSubjects,
        student_data_involved: form.student_data_involved || null,
        estimated_cost: form.estimated_cost || null,
        alternatives_considered: form.alternatives_considered || null,
      })
      .select("id")
      .single();

    if (error || !request) {
      console.error("Error creating request:", error);
      setSubmitting(false);
      return;
    }

    // Create rubric evaluation if a template was selected and scores exist
    if (selectedTemplateId && scoredCriteria > 0) {
      const allCriteria = rubricCategories.flatMap((c) => c.criteria);
      const totalPossible = allCriteria.length * 4;
      const totalScore = allCriteria.reduce(
        (sum, c) => sum + (scores[c.id] || 0),
        0
      );

      const { data: evaluation } = await supabase
        .from("rubric_evaluations")
        .insert({
          request_id: request.id,
          template_id: selectedTemplateId,
          evaluator_id: user.id,
          evaluator_role: "requester",
          total_score: totalScore,
          total_possible: totalPossible,
          percentage: weightedScore,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (evaluation) {
        const scoreRows = Object.entries(scores).map(([criterionId, score]) => ({
          evaluation_id: evaluation.id,
          criterion_id: criterionId,
          score,
        }));
        await supabase.from("rubric_scores").insert(scoreRows);
      }
    }

    router.push("/dashboard/requests");
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Request a New Tool</h1>
        <p className="text-muted mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/requests"
          className="text-sm text-primary hover:text-primary-dark"
        >
          &larr; Back to Requests
        </Link>
        <h1 className="text-2xl font-bold mt-2">Request a New Tool</h1>
        <p className="text-sm text-muted mt-2">
          Search the shared library first. If the tool already exists, select it
          and request it for your district. If not, your request will create a
          new shared entry.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {(["info", "rubric", "review"] as const).map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1 rounded-full ${
                step === s
                  ? "bg-primary"
                  : i < ["info", "rubric", "review"].indexOf(step)
                  ? "bg-primary/40"
                  : "bg-gray-200"
              }`}
            />
            <p
              className={`text-xs mt-1 ${
                step === s ? "text-primary font-medium" : "text-muted"
              }`}
            >
              {s === "info"
                ? "1. Tool Info"
                : s === "rubric"
                ? "2. Self-Evaluation"
                : "3. Review & Submit"}
            </p>
          </div>
        ))}
      </div>

      {/* Step 1: Tool Info */}
      {step === "info" && (
        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Tool Information</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <label className="block text-sm font-medium mb-2">
                Search the shared library first
              </label>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (selectedGlobalTool) {
                    setSelectedGlobalTool(null);
                  }
                }}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Search by tool name or vendor..."
              />
              <p className="text-xs text-blue-800 mt-2">
                Choosing an existing tool reduces duplicates and preserves shared
                metadata across districts.
              </p>

              <div className="mt-3 space-y-2">
                {filteredGlobalTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => selectGlobalTool(tool)}
                    className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                      selectedGlobalTool?.id === tool.id
                        ? "border-primary bg-white"
                        : "border-blue-100 bg-white/80 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tool.canonical_name}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {tool.vendor || "Unknown vendor"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        <p>{tool.district_adoption_count} districts</p>
                        <p>{tool.request_count} requests</p>
                      </div>
                    </div>
                    {tool.description && (
                      <p className="text-xs text-muted mt-2 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {selectedGlobalTool ? (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm text-emerald-900">
                    Requesting existing library entry:{" "}
                    <span className="font-medium">
                      {selectedGlobalTool.canonical_name}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={clearGlobalToolSelection}
                    className="text-sm font-medium text-emerald-900"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted mt-3">
                  Don&apos;t see it? Continue below and your submission will add
                  a new entry to the shared library.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tool Name *
              </label>
              <input
                type="text"
                value={form.tool_name}
                onChange={(e) => setForm({ ...form, tool_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Nearpod"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Nearpod Inc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                What does this tool do?
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Brief description of the tool..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Why do you need this tool? *
              </label>
              <textarea
                rows={3}
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Explain the educational need this tool addresses and why existing approved tools don't meet it..."
              />
            </div>

            {/* Grade levels */}
            <div>
              <label className="block text-sm font-medium mb-2">Grade Levels</label>
              <div className="flex gap-2">
                {GRADE_OPTIONS.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => toggleGrade(grade)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedGrades.includes(grade)
                        ? "bg-primary text-white border-primary"
                        : "border-border hover:bg-gray-50"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects */}
            <div>
              <label className="block text-sm font-medium mb-2">Subject Areas</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedSubjects.includes(subject)
                        ? "bg-primary text-white border-primary"
                        : "border-border hover:bg-gray-50"
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                What student data will this tool access?
              </label>
              <textarea
                rows={2}
                value={form.student_data_involved}
                onChange={(e) => setForm({ ...form, student_data_involved: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Student names, email addresses, assignment responses..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Cost</label>
              <input
                type="text"
                value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Free, $3/student/year, $500 site license..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Approved alternatives you considered
              </label>
              <textarea
                rows={2}
                value={form.alternatives_considered}
                onChange={(e) => setForm({ ...form, alternatives_considered: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="What existing approved tools did you look at, and why don't they meet your needs?"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep("rubric")}
              disabled={!form.tool_name || !form.justification}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Next: Self-Evaluation
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Rubric Self-Evaluation */}
      {step === "rubric" && (
        <div>
          {/* Template picker */}
          {templates.length > 1 && (
            <div className="bg-white border border-border rounded-xl p-4 mb-6">
              <label className="block text-sm font-medium mb-2">
                Choose an evaluation rubric for this request
              </label>
              <div className="flex gap-2 flex-wrap">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      t.id === selectedTemplateId
                        ? "bg-primary text-white"
                        : "bg-white border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {templates.length === 1 && (
            <div className="bg-white border border-border rounded-xl p-4 mb-6">
              <p className="text-sm">
                Using rubric: <span className="font-medium">{templates[0].name}</span>
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Self-evaluation:</span> Score each
              criterion based on your understanding of the tool. A reviewer will
              independently score the same rubric. This helps identify gaps in
              understanding early.
            </p>
          </div>

          <div className="space-y-6">
            {rubricCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{category.name}</h3>
                  <span className="text-sm text-muted">Weight: {category.weight}%</span>
                </div>

                <div className="space-y-5">
                  {category.criteria.map((criterion) => (
                    <div key={criterion.id}>
                      <p className="text-sm font-medium mb-1">{criterion.prompt}</p>
                      <p className="text-xs text-muted mb-2">{criterion.description}</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map((score) => (
                          <button
                            key={score}
                            onClick={() => setScore(criterion.id, score)}
                            className={`flex-1 px-2 py-2 text-xs rounded-lg border transition-colors ${
                              scores[criterion.id] === score
                                ? "bg-primary text-white border-primary"
                                : "border-border hover:bg-gray-50"
                            }`}
                          >
                            <span className="font-bold block">{score}</span>
                            <span className="block mt-0.5">{SCORE_LABELS[score]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Score summary */}
          <div className="mt-6 bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">
                  {scoredCriteria} of {totalCriteria} criteria scored
                </p>
                <p className="text-2xl font-bold mt-1">
                  {weightedScore.toFixed(1)}%
                  <span className="text-sm font-normal text-muted ml-2">
                    weighted score
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("info")}
                  className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("review")}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  Next: Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === "review" && (
        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Review & Submit</h2>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">{form.tool_name}</p>
              <p className="text-xs text-muted mb-2">
                {selectedGlobalTool
                  ? "Based on an existing shared library entry"
                  : "Will create a new shared library entry if no match exists"}
              </p>
              <p className="text-xs text-muted">{form.justification}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted mb-1">
                Rubric: {templates.find((t) => t.id === selectedTemplateId)?.name}
              </p>
              <p className="text-2xl font-bold">{weightedScore.toFixed(1)}%</p>
              <p className="text-xs text-muted mt-1">
                {scoredCriteria} of {totalCriteria} criteria scored
              </p>
            </div>

            <p className="text-sm text-muted">
              Your request will be submitted for review. A district reviewer
              will independently evaluate the tool using the same rubric. You
              will be notified when a decision is made.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("rubric")}
              className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-success text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
