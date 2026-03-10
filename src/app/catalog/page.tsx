"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tool, Category } from "@/lib/types";

const ALL_GRADES = ["K-2", "3-5", "6-8", "9-12"];

function DpaStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    signed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    not_required: "bg-gray-100 text-gray-600",
    none: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    signed: "DPA Signed",
    pending: "DPA Pending",
    not_required: "DPA N/A",
    none: "No DPA",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.none}`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function CatalogPage() {
  const [tools, setTools] = useState<(Tool & { category?: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all"
  );
  const [selectedGrade, setSelectedGrade] = useState<string | "all">("all");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [toolsRes, categoriesRes] = await Promise.all([
        supabase
          .from("tools")
          .select("*, category:categories(*)")
          .eq("status", "approved")
          .order("name"),
        supabase.from("categories").select("*").order("sort_order"),
      ]);

      if (toolsRes.data) setTools(toolsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        search === "" ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.vendor?.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || tool.category_id === selectedCategory;

      const matchesGrade =
        selectedGrade === "all" || tool.grade_levels?.includes(selectedGrade);

      return matchesSearch && matchesCategory && matchesGrade;
    });
  }, [tools, search, selectedCategory, selectedGrade]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-foreground">
            EdTech Library
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">Springfield USD</span>
            <Link
              href="/login"
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">Approved Tools</h1>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tools by name, vendor, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Grades</option>
              {ALL_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-16">
            <p className="text-muted">Loading tools...</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            <p className="text-sm text-muted mb-4">
              {filteredTools.length} tool
              {filteredTools.length !== 1 ? "s" : ""} found
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-muted">{tool.vendor}</p>
                    </div>
                    <DpaStatusBadge status={tool.dpa_status} />
                  </div>

                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {tool.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tool.grade_levels?.map((grade) => (
                      <span
                        key={grade}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {grade}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tool.subject_areas?.map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted">
                      {tool.category?.name}
                    </span>
                    {tool.url && (
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary-dark font-medium"
                      >
                        Visit site
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted">No tools match your filters.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
