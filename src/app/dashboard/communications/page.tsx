"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDashboardContext } from "@/lib/dashboard";

type CommunicationItem = {
  id: string;
  toolName: string;
  status: string;
  createdAt: string;
};

export default function CommunicationsPage() {
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<CommunicationItem[]>([]);

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("tool_requests")
        .select("id, tool_name, status, updated_at")
        .eq("district_id", context.districtId)
        .in("status", ["approved", "denied", "more_info_needed", "in_review"])
        .order("updated_at", { ascending: false })
        .limit(10);

      setRecentEvents(
        (data || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          toolName: item.tool_name as string,
          status: item.status as string,
          createdAt: item.updated_at as string,
        }))
      );
      setLoading(false);
    }

    load();
  }, []);

  const messageTypes = [
    "Newly approved tools and why they were approved",
    "Deprecated or phased-out tools with replacement guidance",
    "Implementation notes, training links, and district-specific setup",
    "Portfolio highlights for district favorites or seasonal recommendations",
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Communications Workspace
        </p>
        <h1 className="text-3xl font-semibold">Communication and change management</h1>
        <p className="text-muted max-w-3xl">
          EdTech governance only works when educators hear about decisions at
          the right moment. This workspace frames the app as a communication
          channel, not just a record system.
        </p>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent decision events</h2>
            <Link href="/dashboard/requests" className="text-sm text-primary font-medium">
              Open requests
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-muted">
              No recent approval or review events are available to announce.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{event.toolName}</p>
                    <p className="text-sm text-muted mt-1">
                      Status changed to {event.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Announcement templates</h2>
            <div className="space-y-3">
              {messageTypes.map((message) => (
                <div
                  key={message}
                  className="rounded-xl border border-border px-4 py-3 text-sm text-slate-700"
                >
                  {message}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">What to add next</h2>
            <p className="text-sm text-muted">
              Add saved announcement drafts, audience targeting, and scheduled
              notifications so approvals, deprecations, and implementation
              guidance can be pushed directly to staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
