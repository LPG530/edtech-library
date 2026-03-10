"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    approved: 0,
    pending: 0,
    denied: 0,
    expiringDpas: 0,
  });
  const [recentRequests, setRecentRequests] = useState<
    { id: string; tool_name: string; requested_by_name: string; created_at: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

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

      const districtId = profile.district_id;

      // Fetch stats in parallel
      const [approvedRes, pendingRes, deniedRes, expiringRes, requestsRes] =
        await Promise.all([
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", districtId)
            .eq("status", "approved"),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", districtId)
            .in("status", ["submitted", "in_review"]),
          supabase
            .from("tool_requests")
            .select("id", { count: "exact", head: true })
            .eq("district_id", districtId)
            .eq("status", "denied"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", districtId)
            .eq("status", "approved")
            .not("dpa_expiration", "is", null)
            .lte("dpa_expiration", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          supabase
            .from("tool_requests")
            .select("id, tool_name, status, created_at, requested_by(full_name)")
            .eq("district_id", districtId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      setStats({
        approved: approvedRes.count || 0,
        pending: pendingRes.count || 0,
        denied: deniedRes.count || 0,
        expiringDpas: expiringRes.count || 0,
      });

      if (requestsRes.data) {
        setRecentRequests(
          requestsRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            tool_name: r.tool_name as string,
            requested_by_name: (r.requested_by as Record<string, string>)?.full_name || "Unknown",
            created_at: r.created_at as string,
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Approved Tools</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.approved}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Pending Requests</p>
          <p className="text-3xl font-bold text-warning">
            {loading ? "-" : stats.pending}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">Denied Requests</p>
          <p className="text-3xl font-bold text-danger">
            {loading ? "-" : stats.denied}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted mb-1">DPAs Expiring Soon</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "-" : stats.expiringDpas}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Requests</h2>
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
                    <span className="font-medium">
                      {req.requested_by_name}
                    </span>{" "}
                    {statusLabel[req.status] || "requested"}{" "}
                    <span className="font-medium">{req.tool_name}</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/dashboard/requests"
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Review Pending Requests
        </Link>
        <Link
          href="/dashboard/tools"
          className="px-4 py-2 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Manage Tools
        </Link>
      </div>
    </div>
  );
}
