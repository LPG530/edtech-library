"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDashboardContext } from "@/lib/dashboard";

type ApprovalStats = {
  submitted: number;
  inReview: number;
  approved: number;
  moreInfo: number;
  activeRubrics: number;
};

type ApprovalItem = {
  id: string;
  toolName: string;
  requestedByName: string;
  status: string;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900",
  in_review: "bg-blue-100 text-blue-900",
  approved: "bg-emerald-100 text-emerald-900",
  denied: "bg-rose-100 text-rose-900",
  more_info_needed: "bg-orange-100 text-orange-900",
};

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("staff");
  const [stats, setStats] = useState<ApprovalStats>({
    submitted: 0,
    inReview: 0,
    approved: 0,
    moreInfo: 0,
    activeRubrics: 0,
  });
  const [requests, setRequests] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      setUserRole(context.role);
      const supabase = createClient();
      const [
        submittedRes,
        reviewRes,
        approvedRes,
        moreInfoRes,
        rubricRes,
        requestRes,
      ] = await Promise.all([
        supabase
          .from("tool_requests")
          .select("id", { count: "exact", head: true })
          .eq("district_id", context.districtId)
          .eq("status", "submitted"),
        supabase
          .from("tool_requests")
          .select("id", { count: "exact", head: true })
          .eq("district_id", context.districtId)
          .eq("status", "in_review"),
        supabase
          .from("tool_requests")
          .select("id", { count: "exact", head: true })
          .eq("district_id", context.districtId)
          .eq("status", "approved"),
        supabase
          .from("tool_requests")
          .select("id", { count: "exact", head: true })
          .eq("district_id", context.districtId)
          .eq("status", "more_info_needed"),
        supabase
          .from("rubric_templates")
          .select("id", { count: "exact", head: true })
          .eq("district_id", context.districtId)
          .eq("is_active", true),
        supabase
          .from("tool_requests")
          .select("id, tool_name, status, created_at, requester:users!tool_requests_requested_by_fkey(full_name)")
          .eq("district_id", context.districtId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setStats({
        submitted: submittedRes.count || 0,
        inReview: reviewRes.count || 0,
        approved: approvedRes.count || 0,
        moreInfo: moreInfoRes.count || 0,
        activeRubrics: rubricRes.count || 0,
      });

      if (requestRes.data) {
        setRequests(
          requestRes.data.map((request: Record<string, unknown>) => ({
            id: request.id as string,
            toolName: request.tool_name as string,
            status: request.status as string,
            createdAt: request.created_at as string,
            requestedByName:
              (request.requester as Record<string, string>)?.full_name || "Unknown",
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, []);

  const checklist = [
    "Privacy and student data exposure",
    "Accessibility and accommodation readiness",
    "Instructional value and curricular fit",
    "SSO, rostering, and LMS compatibility",
    "Contracting artifacts such as DPA and terms",
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Approvals Workspace
        </p>
        <h1 className="text-3xl font-semibold">Vetting and approval workflow</h1>
        <p className="text-muted max-w-3xl">
          Keep intake moving with a structured review queue, rubric-backed
          decision making, and a clear line from submission to approval.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Submitted</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.submitted}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">In review</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.inReview}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Approved</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.approved}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">More info needed</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.moreInfo}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Active rubrics</p>
          <p className="text-3xl font-semibold">
            {loading ? "-" : stats.activeRubrics}
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.35fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current queue</h2>
            <Link href="/dashboard/requests" className="text-sm text-primary font-medium">
              Open full request list
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted">
              No requests have been submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-border p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{request.toolName}</p>
                    <p className="text-sm text-muted mt-1">
                      Requested by {request.requestedByName} on{" "}
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[request.status] || "bg-slate-100 text-slate-800"}`}
                  >
                    {request.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Review checklist</h2>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">Next maturity step</h2>
            <p className="text-sm text-muted mb-4">
              The current schema supports submission, review state, and rubric
              scoring. The next backend extension should add conditional
              approval, legal document records, assigned reviewers, and decision
              history by stage.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/dashboard/rubric"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Manage rubrics
              </Link>
              {userRole === "staff" && (
                <Link
                  href="/dashboard/requests/new"
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium"
                >
                  Submit request
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
