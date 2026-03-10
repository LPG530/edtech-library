"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { availableToolStatuses } from "@/lib/types";

type ToolEntry = {
  name: string;
  vendor: string | null;
  description: string | null;
  url: string | null;
  grade_levels: string[];
  subject_areas: string[];
  district_count: number;
};

type DistrictEntry = {
  name: string;
  slug: string;
  tool_count: number;
};

const ALL_GRADES = ["K-2", "3-5", "6-8", "9-12"];

export default function GeneralCatalogPage() {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [districts, setDistricts] = useState<DistrictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | "all">("all");
  const [tab, setTab] = useState<"tools" | "districts">("districts");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Get all approved tools across all districts
      const { data: allTools } = await supabase
        .from("tools")
        .select("name, vendor, description, url, grade_levels, subject_areas, district_id")
        .in("status", [...availableToolStatuses])
        .order("name");

      // Get all districts
      const { data: allDistricts } = await supabase
        .from("districts")
        .select("name, slug, id")
        .order("name");

      if (allTools && allDistricts) {
        // Deduplicate tools by name, count how many districts use each
        const toolMap = new Map<string, ToolEntry>();
        for (const t of allTools) {
          const key = t.name.toLowerCase();
          if (toolMap.has(key)) {
            const existing = toolMap.get(key)!;
            existing.district_count++;
            // Merge grade levels
            for (const g of t.grade_levels || []) {
              if (!existing.grade_levels.includes(g)) {
                existing.grade_levels.push(g);
              }
            }
            // Merge subject areas
            for (const s of t.subject_areas || []) {
              if (!existing.subject_areas.includes(s)) {
                existing.subject_areas.push(s);
              }
            }
          } else {
            toolMap.set(key, {
              name: t.name,
              vendor: t.vendor,
              description: t.description,
              url: t.url,
              grade_levels: [...(t.grade_levels || [])],
              subject_areas: [...(t.subject_areas || [])],
              district_count: 1,
            });
          }
        }
        setTools(Array.from(toolMap.values()));

        // Count tools per district
        const districtToolCounts = new Map<string, number>();
        for (const t of allTools) {
          districtToolCounts.set(
            t.district_id,
            (districtToolCounts.get(t.district_id) || 0) + 1
          );
        }

        setDistricts(
          allDistricts.map((d) => ({
            name: d.name,
            slug: d.slug,
            tool_count: districtToolCounts.get(d.id) || 0,
          }))
        );
      }

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

      const matchesGrade =
        selectedGrade === "all" || tool.grade_levels?.includes(selectedGrade);

      return matchesSearch && matchesGrade;
    });
  }, [tools, search, selectedGrade]);

  const filteredDistricts = useMemo(() => {
    if (search === "") return districts;
    return districts.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [districts, search]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-foreground">
            EdTech Library
          </Link>
          <div className="flex items-center gap-4">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">EdTech Tool Directory</h1>
          <p className="text-sm text-muted">
            Browse edtech tools used by school districts, or find your
            district&apos;s approved catalog.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("districts")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === "districts"
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted hover:text-foreground"
            }`}
          >
            Find Your District
          </button>
          <button
            onClick={() => setTab("tools")}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === "tools"
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted hover:text-foreground"
            }`}
          >
            All EdTech Tools
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder={
                tab === "districts"
                  ? "Search for your district..."
                  : "Search tools by name, vendor, or description..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {tab === "tools" && (
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
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <p className="text-muted">Loading...</p>
          </div>
        )}

        {/* Districts tab */}
        {!loading && tab === "districts" && (
          <>
            <p className="text-sm text-muted mb-4">
              {filteredDistricts.length} district
              {filteredDistricts.length !== 1 ? "s" : ""}
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDistricts.map((district) => (
                <Link
                  key={district.slug}
                  href={`/catalog/${district.slug}`}
                  className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow block"
                >
                  <h3 className="font-semibold text-foreground mb-1">
                    {district.name}
                  </h3>
                  <p className="text-sm text-muted">
                    {district.tool_count} approved tool
                    {district.tool_count !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>

            {filteredDistricts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted">
                  No districts found. Is your district not listed?{" "}
                  <Link
                    href="/signup"
                    className="text-primary hover:text-primary-dark font-medium"
                  >
                    Sign up free
                  </Link>
                </p>
              </div>
            )}
          </>
        )}

        {/* Tools tab */}
        {!loading && tab === "tools" && (
          <>
            <p className="text-sm text-muted mb-4">
              {filteredTools.length} tool
              {filteredTools.length !== 1 ? "s" : ""} across all districts
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.name}
                  className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-foreground">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-muted">{tool.vendor}</p>
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
                      Used by {tool.district_count} district
                      {tool.district_count !== 1 ? "s" : ""}
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
