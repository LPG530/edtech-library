"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ToolRequest } from "@/lib/types";

const statusStyles: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  more_info_needed: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  denied: "Denied",
  more_info_needed: "More Info Needed",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<
    (ToolRequest & { requester?: { full_name: string } })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("staff");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("district_id, role")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      setUserRole(profile.role);

      let query = supabase
        .from("tool_requests")
        .select("*, requester:users!tool_requests_requested_by_fkey(full_name)")
        .eq("district_id", profile.district_id)
        .order("created_at", { ascending: false });

      // Staff only see their own requests
      if (profile.role === "staff") {
        query = query.eq("requested_by", user.id);
      }

      const { data } = await query;

      if (data) setRequests(data);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(requestId: string, newStatus: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("tool_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    // Add review action
    if (user) {
      await supabase.from("review_actions").insert({
        request_id: requestId,
        reviewer_id: user.id,
        action:
          newStatus === "approved"
            ? "approved"
            : newStatus === "denied"
            ? "denied"
            : newStatus === "in_review"
            ? "assigned"
            : "requested_info",
        comment: null,
      });
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: newStatus as ToolRequest["status"] } : r
      )
    );
  }

  async function approveAndAddTool(request: ToolRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Update request status
    await updateStatus(request.id, "approved");

    // Add tool to catalog
    await supabase.from("tools").insert({
      district_id: request.district_id,
      global_tool_id: request.global_tool_id,
      name: request.tool_name,
      vendor: request.vendor,
      description: request.description,
      url: request.url,
      grade_levels: request.grade_levels,
      subject_areas: request.subject_areas,
      dpa_status: "pending",
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    });

    if (request.global_tool_id) {
      await supabase.rpc("register_global_tool_adoption", {
        p_global_tool_id: request.global_tool_id,
      });
    }
  }

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tool Requests</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tool Requests</h1>
        <Link
          href="/dashboard/requests/new"
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          + New Request
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["all", "submitted", "in_review", "approved", "denied"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === s
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Request cards */}
      <div className="space-y-4">
        {filtered.map((req) => (
          <div
            key={req.id}
            className="bg-white border border-border rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground text-lg">
                  {req.tool_name}
                </h3>
                <p className="text-sm text-muted">
                  Requested by {req.requester?.full_name || "Unknown"} on{" "}
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusStyles[req.status]}`}
              >
                {statusLabels[req.status]}
              </span>
            </div>

            <p className="text-sm text-muted mb-4">{req.justification}</p>

            {req.grade_levels && req.grade_levels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {req.grade_levels.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {g}
                  </span>
                ))}
                {req.subject_areas?.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {userRole !== "staff" && (
              <div className="flex gap-2">
                {req.status === "submitted" && (
                  <>
                    <button
                      onClick={() => updateStatus(req.id, "in_review")}
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                      Start Review
                    </button>
                    <button
                      onClick={() => updateStatus(req.id, "more_info_needed")}
                      className="px-3 py-1.5 border border-border text-sm rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Request More Info
                    </button>
                  </>
                )}
                {req.status === "in_review" && (
                  <>
                    <button
                      onClick={() => approveAndAddTool(req)}
                      className="px-3 py-1.5 bg-success text-white text-sm rounded-lg font-medium hover:opacity-90 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(req.id, "denied")}
                      className="px-3 py-1.5 bg-danger text-white text-sm rounded-lg font-medium hover:opacity-90 transition-colors"
                    >
                      Deny
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted">
              {filter === "all"
                ? "No requests yet. Staff can submit requests for new tools."
                : "No requests match this filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
