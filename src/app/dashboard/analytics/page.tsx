"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDashboardContext } from "@/lib/dashboard";
import { availableToolStatuses } from "@/lib/types";

type AnalyticsSnapshot = {
  approvedTools: number;
  requestVolume: number;
  deniedRequests: number;
  categories: number;
  adminsAndReviewers: number;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsSnapshot>({
    approvedTools: 0,
    requestVolume: 0,
    deniedRequests: 0,
    categories: 0,
    adminsAndReviewers: 0,
  });

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      const supabase = createClient();
      const [toolsRes, requestsRes, deniedRes, categoriesRes, reviewersRes] =
        await Promise.all([
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses]),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("status", "denied"),
          supabase
            .from("categories")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("role", ["admin", "reviewer"]),
        ]);

      setStats({
        approvedTools: toolsRes.count || 0,
        requestVolume: requestsRes.count || 0,
        deniedRequests: deniedRes.count || 0,
        categories: categoriesRes.count || 0,
        adminsAndReviewers: reviewersRes.count || 0,
      });
      setLoading(false);
    }

    load();
  }, []);

  const futureSignals = [
    "Active teachers and students by tool",
    "Usage by school, grade, and department",
    "License utilization and seat waste",
    "Duplicate products solving the same job",
    "ROI indicators tied to adoption and outcomes",
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Analytics Workspace
        </p>
        <h1 className="text-3xl font-semibold">Usage and impact analytics</h1>
        <p className="text-muted max-w-3xl">
          This workspace is the bridge from governance to ROI. Today it exposes
          portfolio signals already present in the app and makes clear what
          telemetry should be added next.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Approved tools</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.approvedTools}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Total requests</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.requestVolume}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Denied requests</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.deniedRequests}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Portfolio categories</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.categories}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Review capacity</p>
          <p className="text-3xl font-semibold">
            {loading ? "-" : stats.adminsAndReviewers}
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Current portfolio signals</h2>
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              The existing schema can already show portfolio breadth, review
              volume, denial rate, and how much operational review capacity your
              district has assigned.
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              What it cannot show yet is actual usage. There are no connected
              LMS, SSO, rostering, or license metrics in the current data model.
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              The next useful integration layer is vendor/application telemetry
              plus SIS/LMS mappings so the dashboard can answer adoption and ROI
              questions with evidence instead of inference.
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Signals to add next</h2>
          <div className="space-y-3 mb-6">
            {futureSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-xl border border-border px-4 py-3 text-sm text-slate-700"
              >
                {signal}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/tools"
            className="inline-flex px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Inspect current library
          </Link>
        </div>
      </div>
    </div>
  );
}
