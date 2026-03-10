"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Criterion = {
  id: string;
  prompt: string;
  description: string;
  score_type: "scale" | "yes_no" | "met_partial_not";
  sort_order: number;
};

type RubricCategory = {
  id: string;
  name: string;
  description: string;
  weight: number;
  sort_order: number;
  criteria: Criterion[];
};

type RubricTemplate = {
  id: string;
  name: string;
  is_active: boolean;
  categories: RubricCategory[];
};

export default function RubricBuilderPage() {
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState(false);
  const [districtId, setDistrictId] = useState<string | null>(null);

  async function loadTemplates() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("users")
      .select("district_id")
      .eq("id", user.id)
      .single();
    if (!profile) { setLoading(false); return; }

    setDistrictId(profile.district_id);

    const { data: templateRows } = await supabase
      .from("rubric_templates")
      .select("id, name, is_active")
      .eq("district_id", profile.district_id)
      .order("created_at");
    if (!templateRows || templateRows.length === 0) {
      setLoading(false);
      return;
    }

    // Load categories+criteria for all templates
    const fullTemplates: RubricTemplate[] = [];
    for (const t of templateRows) {
      const { data: cats } = await supabase
        .from("rubric_categories")
        .select("*, criteria:rubric_criteria(*)")
        .eq("template_id", t.id)
        .order("sort_order");

      fullTemplates.push({
        id: t.id,
        name: t.name,
        is_active: t.is_active,
        categories: (cats || []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          description: (c.description as string) || "",
          weight: Number(c.weight),
          sort_order: c.sort_order as number,
          criteria: ((c.criteria as Record<string, unknown>[]) || [])
            .map((cr) => ({
              id: cr.id as string,
              prompt: cr.prompt as string,
              description: (cr.description as string) || "",
              score_type: cr.score_type as Criterion["score_type"],
              sort_order: cr.sort_order as number,
            }))
            .sort((a: Criterion, b: Criterion) => a.sort_order - b.sort_order),
        })),
      });
    }

    setTemplates(fullTemplates);
    setSelectedTemplateId(fullTemplates[0].id);
    setLoading(false);
  }

  useEffect(() => {
    async function initializeTemplates() {
      await loadTemplates();
    }

    void initializeTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const categories = selectedTemplate?.categories || [];
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  function updateCategories(newCategories: RubricCategory[]) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplateId
          ? { ...t, categories: newCategories }
          : t
      )
    );
    setSaved(false);
  }

  function updateCategory(id: string, updates: Partial<RubricCategory>) {
    updateCategories(
      categories.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  function removeCategory(id: string) {
    updateCategories(categories.filter((c) => c.id !== id));
  }

  function addCategory() {
    const newCat: RubricCategory = {
      id: crypto.randomUUID(),
      name: "New Category",
      description: "",
      weight: 0,
      sort_order: categories.length,
      criteria: [],
    };
    updateCategories([...categories, newCat]);
    setEditingCategory(newCat.id);
  }

  function addCriterion(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    const newCriterion: Criterion = {
      id: crypto.randomUUID(),
      prompt: "New criterion",
      description: "",
      score_type: "scale",
      sort_order: cat?.criteria.length || 0,
    };
    updateCategories(
      categories.map((c) =>
        c.id === categoryId
          ? { ...c, criteria: [...c.criteria, newCriterion] }
          : c
      )
    );
    setEditingCriterion(newCriterion.id);
  }

  function updateCriterion(
    categoryId: string,
    criterionId: string,
    updates: Partial<Criterion>
  ) {
    updateCategories(
      categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              criteria: c.criteria.map((cr) =>
                cr.id === criterionId ? { ...cr, ...updates } : cr
              ),
            }
          : c
      )
    );
  }

  function removeCriterion(categoryId: string, criterionId: string) {
    updateCategories(
      categories.map((c) =>
        c.id === categoryId
          ? { ...c, criteria: c.criteria.filter((cr) => cr.id !== criterionId) }
          : c
      )
    );
  }

  function updateTemplateName(name: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplateId ? { ...t, name } : t
      )
    );
    setSaved(false);
  }

  async function handleCreateTemplate() {
    if (!districtId) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("rubric_templates")
      .insert({
        district_id: districtId,
        name: "New Rubric Template",
        is_active: true,
      })
      .select("id, name, is_active")
      .single();

    if (data) {
      const newTemplate: RubricTemplate = {
        id: data.id,
        name: data.name,
        is_active: data.is_active,
        categories: [],
      };
      setTemplates((prev) => [...prev, newTemplate]);
      setSelectedTemplateId(data.id);
      setEditingTemplateName(true);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId || templates.length <= 1) return;
    const supabase = createClient();

    await supabase
      .from("rubric_templates")
      .delete()
      .eq("id", selectedTemplateId);

    setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
    setSelectedTemplateId(templates.find((t) => t.id !== selectedTemplateId)?.id || null);
  }

  function handleExportCsv() {
    if (!selectedTemplate) return;

    const scoreTypeLabel: Record<string, string> = {
      scale: "Scale (1-4)",
      yes_no: "Yes / No",
      met_partial_not: "Met / Partial / Not Met",
    };

    const rows: string[][] = [
      ["Category", "Weight (%)", "Criterion", "Description", "Score Type"],
    ];

    for (const cat of categories) {
      if (cat.criteria.length === 0) {
        rows.push([cat.name, String(cat.weight), "", "", ""]);
      } else {
        for (const cr of cat.criteria) {
          rows.push([
            cat.name,
            String(cat.weight),
            cr.prompt,
            cr.description,
            scoreTypeLabel[cr.score_type] || cr.score_type,
          ]);
        }
      }
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    if (!selectedTemplateId || !selectedTemplate) return;
    setSaving(true);

    const supabase = createClient();

    // Update template name
    await supabase
      .from("rubric_templates")
      .update({ name: selectedTemplate.name, updated_at: new Date().toISOString() })
      .eq("id", selectedTemplateId);

    // Delete existing categories (cascade handles criteria)
    await supabase
      .from("rubric_categories")
      .delete()
      .eq("template_id", selectedTemplateId);

    // Insert all categories and criteria fresh
    for (const cat of categories) {
      const { data: newCat } = await supabase
        .from("rubric_categories")
        .insert({
          template_id: selectedTemplateId,
          name: cat.name,
          description: cat.description || null,
          weight: cat.weight,
          sort_order: cat.sort_order,
        })
        .select("id")
        .single();

      if (newCat && cat.criteria.length > 0) {
        await supabase.from("rubric_criteria").insert(
          cat.criteria.map((cr, i) => ({
            category_id: newCat.id,
            prompt: cr.prompt,
            description: cr.description || null,
            score_type: cr.score_type,
            sort_order: i,
          }))
        );
      }
    }

    setSaving(false);
    setSaved(true);

    // Reload to get fresh IDs
    await loadTemplates();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Rubric Builder</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rubric Builder</h1>
          <p className="text-sm text-muted mt-1">
            Create and manage evaluation rubrics. Attach any rubric to a
            specific tool request.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-success font-medium">Saved</span>
          )}
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Rubric"}
          </button>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplateId(t.id);
                setEditingTemplateName(false);
                setSaved(false);
              }}
              className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                t.id === selectedTemplateId
                  ? "bg-primary text-white"
                  : "bg-white border border-border text-muted hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreateTemplate}
          className="px-3 py-2 border border-dashed border-border text-sm rounded-lg font-medium text-muted hover:text-foreground hover:border-primary/30 transition-colors whitespace-nowrap"
        >
          + New Template
        </button>
      </div>

      {selectedTemplate && (
        <>
          {/* Template name editor */}
          <div className="bg-white border border-border rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              {editingTemplateName ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={selectedTemplate.name}
                    onChange={(e) => updateTemplateName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                  <button
                    onClick={() => setEditingTemplateName(false)}
                    className="text-sm text-primary font-medium"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-lg">
                    {selectedTemplate.name}
                  </h2>
                  <button
                    onClick={() => setEditingTemplateName(true)}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    Rename
                  </button>
                  {templates.length > 1 && (
                    <button
                      onClick={handleDeleteTemplate}
                      className="text-sm text-danger hover:opacity-80 font-medium"
                    >
                      Delete Template
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Weight summary */}
          <div
            className={`p-4 rounded-xl border mb-6 ${
              totalWeight === 100
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Total Weight: {totalWeight}%
                {totalWeight !== 100 && (
                  <span className="text-yellow-700 ml-2">
                    (should equal 100%)
                  </span>
                )}
              </p>
              <div className="flex gap-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="h-3 rounded-full bg-primary/70"
                    style={{ width: `${cat.weight * 2}px` }}
                    title={`${cat.name}: ${cat.weight}%`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-border rounded-xl"
              >
                {/* Category header */}
                <div className="p-5 border-b border-border">
                  {editingCategory === category.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) =>
                          updateCategory(category.id, {
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) =>
                          updateCategory(category.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Category description..."
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Weight:</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={category.weight}
                          onChange={(e) =>
                            updateCategory(category.id, {
                              weight: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <span className="text-sm text-muted">%</span>
                      </div>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="text-sm text-primary font-medium"
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted">
                          {category.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted">
                          {category.weight}%
                        </span>
                        <button
                          onClick={() => setEditingCategory(category.id)}
                          className="text-sm text-primary hover:text-primary-dark font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeCategory(category.id)}
                          className="text-sm text-danger hover:opacity-80 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Criteria list */}
                <div className="divide-y divide-border">
                  {category.criteria.map((criterion) => (
                    <div key={criterion.id} className="px-5 py-3">
                      {editingCriterion === criterion.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={criterion.prompt}
                            onChange={(e) =>
                              updateCriterion(category.id, criterion.id, {
                                prompt: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <input
                            type="text"
                            value={criterion.description}
                            onChange={(e) =>
                              updateCriterion(category.id, criterion.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Guidance for evaluators..."
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <div className="flex items-center gap-3">
                            <select
                              value={criterion.score_type}
                              onChange={(e) =>
                                updateCriterion(category.id, criterion.id, {
                                  score_type: e.target
                                    .value as Criterion["score_type"],
                                })
                              }
                              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                              <option value="scale">Scale (1-4)</option>
                              <option value="yes_no">Yes / No</option>
                              <option value="met_partial_not">
                                Met / Partial / Not Met
                              </option>
                            </select>
                            <button
                              onClick={() => setEditingCriterion(null)}
                              className="text-sm text-primary font-medium"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {criterion.prompt}
                            </p>
                            <p className="text-xs text-muted">
                              {criterion.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded">
                              {criterion.score_type === "scale"
                                ? "1-4 Scale"
                                : criterion.score_type === "yes_no"
                                ? "Yes/No"
                                : "Met/Partial/Not"}
                            </span>
                            <button
                              onClick={() =>
                                setEditingCriterion(criterion.id)
                              }
                              className="text-xs text-primary hover:text-primary-dark font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                removeCriterion(category.id, criterion.id)
                              }
                              className="text-xs text-danger hover:opacity-80 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add criterion */}
                <div className="px-5 py-3 border-t border-border">
                  <button
                    onClick={() => addCriterion(category.id)}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    + Add Criterion
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add category */}
          <button
            onClick={addCategory}
            className="mt-4 w-full py-3 border-2 border-dashed border-border rounded-xl text-sm font-medium text-muted hover:text-foreground hover:border-primary/30 transition-colors"
          >
            + Add Category
          </button>
        </>
      )}
    </div>
  );
}
