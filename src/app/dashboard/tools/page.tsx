"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tool, Category } from "@/lib/types";

const DPA_OPTIONS = [
  { value: "signed", label: "Signed" },
  { value: "pending", label: "Pending" },
  { value: "not_required", label: "Not Required" },
  { value: "none", label: "None" },
];

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "under_review", label: "Under Review" },
  { value: "retired", label: "Retired" },
];

const dpaStyles: Record<string, string> = {
  signed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  not_required: "bg-gray-100 text-gray-600",
  none: "bg-red-100 text-red-800",
};

const statusStyles: Record<string, string> = {
  approved: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  denied: "bg-red-100 text-red-800",
  retired: "bg-gray-100 text-gray-600",
};

export default function ManageToolsPage() {
  const [tools, setTools] = useState<(Tool & { category?: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [districtId, setDistrictId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    vendor: "",
    description: "",
    url: "",
    category_id: "",
    dpa_status: "none",
    grade_levels: [] as string[],
    subject_areas: [] as string[],
  });

  useEffect(() => {
    async function load() {
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

      const [toolsRes, catsRes] = await Promise.all([
        supabase
          .from("tools")
          .select("*, category:categories(*)")
          .eq("district_id", profile.district_id)
          .order("name"),
        supabase
          .from("categories")
          .select("*")
          .eq("district_id", profile.district_id)
          .order("sort_order"),
      ]);

      if (toolsRes.data) setTools(toolsRes.data);
      if (catsRes.data) {
        setCategories(catsRes.data);
        if (catsRes.data.length > 0) {
          setForm((f) => ({ ...f, category_id: catsRes.data[0].id }));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!form.name || !districtId) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("tools")
      .insert({
        district_id: districtId,
        name: form.name,
        vendor: form.vendor || null,
        description: form.description || null,
        url: form.url || null,
        category_id: form.category_id || null,
        dpa_status: form.dpa_status,
        grade_levels: form.grade_levels,
        subject_areas: form.subject_areas,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .select("*, category:categories(*)")
      .single();

    if (data) {
      setTools((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({
        name: "",
        vendor: "",
        description: "",
        url: "",
        category_id: categories[0]?.id || "",
        dpa_status: "none",
        grade_levels: [],
        subject_areas: [],
      });
      setShowAddForm(false);
    }

    if (error) {
      console.error("Error saving tool:", error);
    }

    setSaving(false);
  }

  async function handleDelete(toolId: string) {
    const supabase = createClient();
    await supabase.from("tools").delete().eq("id", toolId);
    setTools((prev) => prev.filter((t) => t.id !== toolId));
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Manage Tools</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Tools</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          {showAddForm ? "Cancel" : "+ Add Tool"}
        </button>
      </div>

      {/* Add Tool Form */}
      {showAddForm && (
        <div className="bg-white border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Tool</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tool Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Google Classroom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Google"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                DPA Status
              </label>
              <select
                value={form.dpa_status}
                onChange={(e) =>
                  setForm({ ...form, dpa_status: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {DPA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="What does this tool do?"
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
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Tool"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tools Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-left text-sm font-medium text-muted px-5 py-3">
                Tool
              </th>
              <th className="text-left text-sm font-medium text-muted px-5 py-3">
                Vendor
              </th>
              <th className="text-left text-sm font-medium text-muted px-5 py-3">
                Category
              </th>
              <th className="text-left text-sm font-medium text-muted px-5 py-3">
                DPA
              </th>
              <th className="text-left text-sm font-medium text-muted px-5 py-3">
                Status
              </th>
              <th className="text-right text-sm font-medium text-muted px-5 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr
                key={tool.id}
                className="border-b border-border last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-5 py-3 text-sm font-medium">{tool.name}</td>
                <td className="px-5 py-3 text-sm text-muted">
                  {tool.vendor}
                </td>
                <td className="px-5 py-3 text-sm text-muted">
                  {tool.category?.name}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${dpaStyles[tool.dpa_status] || dpaStyles.none}`}
                  >
                    {DPA_OPTIONS.find((o) => o.value === tool.dpa_status)
                      ?.label || tool.dpa_status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusStyles[tool.status] || ""}`}
                  >
                    {STATUS_OPTIONS.find((o) => o.value === tool.status)
                      ?.label || tool.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(tool.id)}
                    className="text-sm text-danger hover:opacity-80 font-medium"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {tools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  No tools yet. Click &quot;+ Add Tool&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
