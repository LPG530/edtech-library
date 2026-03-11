"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { availableToolStatuses, type GlobalTool } from "@/lib/types";

type ToolEntry = Pick<
  GlobalTool,
  | "id"
  | "canonical_name"
  | "vendor"
  | "description"
  | "website_url"
  | "grade_levels"
  | "subject_areas"
  | "request_count"
  | "district_adoption_count"
  | "source"
>;

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

      const [{ data: allTools }, { data: allDistricts }, { data: districtTools }] =
        await Promise.all([
          supabase
            .from("global_tools")
            .select(
              "id, canonical_name, vendor, description, website_url, grade_levels, subject_areas, request_count, district_adoption_count, source"
            )
            .order("canonical_name"),
          supabase.from("districts").select("name, slug, id").order("name"),
          supabase
            .from("tools")
            .select("district_id")
            .in("status", [...availableToolStatuses]),
        ]);

      if (allTools) {
        setTools(allTools as ToolEntry[]);
      }

      if (allDistricts) {
        const districtToolCounts = new Map<string, number>();
        for (const tool of districtTools || []) {
          const districtId = tool.district_id as string;
          districtToolCounts.set(
            districtId,
            (districtToolCounts.get(districtId) || 0) + 1
          );
        }

        setDistricts(
          allDistricts.map((district) => ({
            name: district.name as string,
            slug: district.slug as string,
            tool_count: districtToolCounts.get(district.id as string) || 0,
          }))
        );
      }

      setLoading(false);
    }

    void fetchData();
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        search === "" ||
        tool.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
        tool.vendor?.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase());

      const matchesGrade =
        selectedGrade === "all" || tool.grade_levels?.includes(selectedGrade);

      return matchesSearch && matchesGrade;
    });
  }, [tools, search, selectedGrade]);

  const filteredDistricts = useMemo(() => {
    if (search === "") return districts;
    return districts.filter((district) =>
      district.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [districts, search]);

  return (
    <div className="min-h-screen">
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
            Browse the shared edtech library contributed by districts everywhere,
            or open a district-specific approved catalog.
          </p>
        </div>

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
            Global Tool Library
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder={
                tab === "districts"
                  ? "Search for your district..."
                  : "Search the global library by name, vendor, or description..."
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

        {!loading && tab === "tools" && (
          <>
            <p className="text-sm text-muted mb-4">
              {filteredTools.length} tool
              {filteredTools.length !== 1 ? "s" : ""} in the shared library
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-foreground">
                        {tool.canonical_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium capitalize">
                        {tool.source.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{tool.vendor || "Unknown vendor"}</p>
                  </div>

                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {tool.description || "No description yet. This tool entered the library through community or district activity."}
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
                      {tool.district_adoption_count} district
                      {tool.district_adoption_count !== 1 ? "s" : ""} using it
                    </span>
                    <span className="text-xs text-muted">
                      {tool.request_count} request
                      {tool.request_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {tool.website_url && (
                    <a
                      href={tool.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary-dark font-medium inline-block mt-3"
                    >
                      Visit site
                    </a>
                  )}
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
