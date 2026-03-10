"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDashboardContext } from "@/lib/dashboard";
import { availableToolStatuses } from "@/lib/types";

type GovernanceStats = {
  approved: number;
  underReview: number;
  retired: number;
  signedDpa: number;
  pendingDpa: number;
  noDpa: number;
};

export default function GovernancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GovernanceStats>({
    approved: 0,
    underReview: 0,
    retired: 0,
    signedDpa: 0,
    pendingDpa: 0,
    noDpa: 0,
  });
  const [gradeCoverage, setGradeCoverage] = useState<string[]>([]);
  const [subjectCoverage, setSubjectCoverage] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      const supabase = createClient();
      const [approvedRes, reviewRes, retiredRes, signedRes, pendingRes, noneRes, toolsRes] =
        await Promise.all([
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses]),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("status", "under_review"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("status", "retired"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("dpa_status", "signed"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("dpa_status", "pending"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("dpa_status", ["none", "not_required"]),
          supabase
            .from("tools")
            .select("grade_levels, subject_areas")
            .eq("district_id", context.districtId),
        ]);

      setStats({
        approved: approvedRes.count || 0,
        underReview: reviewRes.count || 0,
        retired: retiredRes.count || 0,
        signedDpa: signedRes.count || 0,
        pendingDpa: pendingRes.count || 0,
        noDpa: noneRes.count || 0,
      });

      const grades = new Set<string>();
      const subjects = new Set<string>();

      for (const tool of toolsRes.data || []) {
        for (const grade of (tool.grade_levels || []) as string[]) {
          grades.add(grade);
        }
        for (const subject of (tool.subject_areas || []) as string[]) {
          subjects.add(subject);
        }
      }

      setGradeCoverage(Array.from(grades).sort());
      setSubjectCoverage(Array.from(subjects).sort());
      setLoading(false);
    }

    load();
  }, []);

  const policyControls = [
    "Approval state and review status",
    "DPA and legal documentation posture",
    "Grade-level and subject visibility",
    "Role-based access for district members",
    "Retirement and under-review flags",
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Governance Workspace
        </p>
        <h1 className="text-3xl font-semibold">Governance and policy controls</h1>
        <p className="text-muted max-w-3xl">
          See the district portfolio through a governance lens: what is approved,
          what is under review, and where policy/compliance coverage is still thin.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Approved tools</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.approved}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Under review</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.underReview}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Retired tools</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.retired}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Signed DPA</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.signedDpa}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Pending DPA</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.pendingDpa}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">No DPA / not required</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.noDpa}</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Policy coverage snapshot</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-medium text-foreground mb-3">Grades covered</p>
              <div className="flex flex-wrap gap-2">
                {gradeCoverage.length === 0 ? (
                  <span className="text-sm text-muted">No grade restrictions recorded yet.</span>
                ) : (
                  gradeCoverage.map((grade) => (
                    <span
                      key={grade}
                      className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-medium"
                    >
                      {grade}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-medium text-foreground mb-3">Subjects covered</p>
              <div className="flex flex-wrap gap-2">
                {subjectCoverage.length === 0 ? (
                  <span className="text-sm text-muted">No subject metadata recorded yet.</span>
                ) : (
                  subjectCoverage.map((subject) => (
                    <span
                      key={subject}
                      className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-medium"
                    >
                      {subject}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Controls in scope</h2>
            <div className="space-y-3">
              {policyControls.map((control) => (
                <div
                  key={control}
                  className="rounded-xl border border-border px-4 py-3 text-sm text-slate-700"
                >
                  {control}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">Next backend expansion</h2>
            <p className="text-sm text-muted mb-4">
              Add explicit restriction states, role-level entitlements, risk
              classifications, and document versioning so governance policy can
              be enforced instead of just displayed.
            </p>
            <Link
              href="/dashboard/tools"
              className="inline-flex px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            >
              Manage tool records
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
