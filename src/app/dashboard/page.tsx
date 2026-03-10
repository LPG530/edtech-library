"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDashboardContext } from "@/lib/dashboard";
import { availableToolStatuses } from "@/lib/types";

type OverviewStats = {
  approvedTools: number;
  pendingReviews: number;
  deniedRequests: number;
  expiringDpas: number;
  rubricTemplates: number;
  activeReviewers: number;
};

type RecentRequest = {
  id: string;
  toolName: string;
  requestedByName: string;
  createdAt: string;
  status: string;
};

const workspaceCards = [
  {
    title: "Vetting and approval",
    description:
      "Route submissions through review, tie decisions to evaluation criteria, and keep a durable audit trail.",
    href: "/dashboard/approvals",
  },
  {
    title: "Governance controls",
    description:
      "Manage approval states, DPA posture, grade access boundaries, and policy decisions in one place.",
    href: "/dashboard/governance",
  },
  {
    title: "Usage and impact",
    description:
      "Track adoption, duplication, and portfolio value once telemetry and SIS/LMS signals are connected.",
    href: "/dashboard/analytics",
  },
  {
    title: "Lifecycle management",
    description:
      "Surface renewals, annual reviews, and phase-out plans before tools become stale or risky.",
    href: "/dashboard/lifecycle",
  },
];

export default function DashboardPage() {
  const [districtName, setDistrictName] = useState<string>("Your district");
  const [stats, setStats] = useState<OverviewStats>({
    approvedTools: 0,
    pendingReviews: 0,
    deniedRequests: 0,
    expiringDpas: 0,
    rubricTemplates: 0,
    activeReviewers: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("staff");

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      setUserRole(context.role);
      setDistrictName(context.districtName || "Your district");

      const supabase = createClient();
      const [
        approvedRes,
        pendingRes,
        deniedRes,
        expiringRes,
        requestsRes,
        rubricRes,
        reviewersRes,
      ] =
        await Promise.all([
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses]),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", ["submitted", "in_review"]),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("status", "denied"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses])
            .not("dpa_expiration", "is", null)
            .lte(
              "dpa_expiration",
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            ),
          supabase
            .from("tool_requests")
            .select("id, tool_name, status, created_at, requested_by(full_name)")
            .eq("district_id", context.districtId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("rubric_templates")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("is_active", true),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("role", ["admin", "reviewer"]),
        ]);

      setStats({
        approvedTools: approvedRes.count || 0,
        pendingReviews: pendingRes.count || 0,
        deniedRequests: deniedRes.count || 0,
        expiringDpas: expiringRes.count || 0,
        rubricTemplates: rubricRes.count || 0,
        activeReviewers: reviewersRes.count || 0,
      });

      if (requestsRes.data) {
        setRecentRequests(
          requestsRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            toolName: r.tool_name as string,
            requestedByName:
              (r.requested_by as Record<string, string>)?.full_name || "Unknown",
            createdAt: r.created_at as string,
            status: r.status as string,
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  const statusDot: Record<string, string> = {
    submitted: "bg-warning",
    in_review: "bg-blue-500",
    approved: "bg-success",
    denied: "bg-danger",
    more_info_needed: "bg-orange-400",
  };

  const statusLabel: Record<string, string> = {
    submitted: "submitted a request for",
    in_review: "is under review:",
    approved: "was approved:",
    denied: "was denied:",
    more_info_needed: "needs more info:",
  };

  const topPriorities = [
    {
      label: "Pending reviews",
      value: stats.pendingReviews,
      tone:
        stats.pendingReviews > 0
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-emerald-50 text-emerald-900 border-emerald-200",
      detail:
        stats.pendingReviews > 0
          ? "Requests are waiting on coordinator review."
          : "Nothing is sitting in the queue.",
      href: "/dashboard/approvals",
    },
    {
      label: "DPAs expiring within 90 days",
      value: stats.expiringDpas,
      tone:
        stats.expiringDpas > 0
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-900 border-slate-200",
      detail:
        stats.expiringDpas > 0
          ? "Renewal work should be scheduled now."
          : "No near-term DPA deadlines are currently flagged.",
      href: "/dashboard/lifecycle",
    },
    {
      label: "Active review frameworks",
      value: stats.rubricTemplates,
      tone:
        stats.rubricTemplates > 0
          ? "bg-blue-50 text-blue-900 border-blue-200"
          : "bg-slate-50 text-slate-900 border-slate-200",
      detail:
        stats.rubricTemplates > 0
          ? "Rubrics are available to standardize decisions."
          : "Create a rubric before intake volume grows.",
      href: "/dashboard/rubric",
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white rounded-3xl p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-100/80 mb-3">
            District EdTech Operations
          </p>
          <h1 className="text-3xl font-semibold mb-3">
            {districtName} program command center
          </h1>
          <p className="text-blue-50/90 max-w-3xl">
            Move beyond a simple catalog. Use this workspace to manage tool
            intake, governance, compliance, lifecycle decisions, and the next
            layer of analytics for your district portfolio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={
                userRole === "staff"
                  ? "/dashboard/requests/new"
                  : "/dashboard/approvals"
              }
              className="px-4 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-medium"
            >
              {userRole === "staff" ? "Submit a tool request" : "Open review queue"}
            </Link>
            <Link
              href="/dashboard/tools"
              className="px-4 py-2.5 rounded-lg border border-white/20 text-white text-sm font-medium"
            >
              Open tool library
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {topPriorities.map((priority) => (
            <Link
              key={priority.label}
              href={priority.href}
              className={`border rounded-2xl p-5 ${priority.tone}`}
            >
              <p className="text-sm mb-2">{priority.label}</p>
              <p className="text-3xl font-semibold mb-2">
                {loading ? "-" : priority.value}
              </p>
              <p className="text-sm">{priority.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Approved tools</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.approvedTools}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Pending reviews</p>
          <p className="text-3xl font-bold text-warning">
            {loading ? "-" : stats.pendingReviews}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Denied requests</p>
          <p className="text-3xl font-bold text-danger">
            {loading ? "-" : stats.deniedRequests}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">DPAs expiring soon</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.expiringDpas}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Active rubrics</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.rubricTemplates}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Admins and reviewers</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.activeReviewers}
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent requests</h2>
            <Link
              href="/dashboard/requests"
              className="text-sm font-medium text-primary"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : recentRequests.length === 0 ? (
            <p className="text-sm text-muted">
              No requests yet. When staff submit tool requests, they will appear
              here.
            </p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div
                    className={`w-2 h-2 mt-2 rounded-full shrink-0 ${statusDot[req.status] || "bg-gray-400"}`}
                  />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{req.requestedByName}</span>{" "}
                      {statusLabel[req.status] || "requested"}{" "}
                      <span className="font-medium">{req.toolName}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Program workspaces</h2>
          <div className="space-y-4">
            {workspaceCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="block rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-slate-50 transition-colors"
              >
                <p className="font-medium text-foreground">{card.title}</p>
                <p className="text-sm text-muted mt-1">{card.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-2">
              Recommended next build-out
            </p>
            <p className="text-sm text-muted">
              Connect actual usage telemetry, vendor risk fields, and document
              storage so the app can move from workflow visibility to full
              portfolio management.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4 flex-wrap">
        {userRole !== "staff" && (
          <>
            <Link
              href="/dashboard/approvals"
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Review pending requests
            </Link>
            <Link
              href="/dashboard/governance"
              className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Open governance controls
            </Link>
          </>
        )}
        <Link
          href="/dashboard/requests/new"
          className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Submit new request
        </Link>
      </div>
    </div>
  );
}
