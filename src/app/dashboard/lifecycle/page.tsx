"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatShortDate, getDashboardContext } from "@/lib/dashboard";
import { availableToolStatuses } from "@/lib/types";

type LifecycleStats = {
  expiringSoon: number;
  retired: number;
  approved: number;
};

type ExpiringTool = {
  id: string;
  name: string;
  vendor: string | null;
  dpaExpiration: string | null;
};

export default function LifecyclePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LifecycleStats>({
    expiringSoon: 0,
    retired: 0,
    approved: 0,
  });
  const [expiringTools, setExpiringTools] = useState<ExpiringTool[]>([]);

  useEffect(() => {
    async function load() {
      const context = await getDashboardContext();
      if (!context) return;

      const supabase = createClient();
      const cutoff = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [expiringRes, retiredRes, approvedRes, expiringToolsRes] =
        await Promise.all([
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses])
            .not("dpa_expiration", "is", null)
            .lte("dpa_expiration", cutoff),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .eq("status", "retired"),
          supabase
            .from("tools")
            .select("id", { count: "exact", head: true })
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses]),
          supabase
            .from("tools")
            .select("id, name, vendor, dpa_expiration")
            .eq("district_id", context.districtId)
            .in("status", [...availableToolStatuses])
            .not("dpa_expiration", "is", null)
            .lte("dpa_expiration", cutoff)
            .order("dpa_expiration", { ascending: true })
            .limit(8),
        ]);

      setStats({
        expiringSoon: expiringRes.count || 0,
        retired: retiredRes.count || 0,
        approved: approvedRes.count || 0,
      });
      setExpiringTools(
        (expiringToolsRes.data || []).map((tool: Record<string, unknown>) => ({
          id: tool.id as string,
          name: tool.name as string,
          vendor: (tool.vendor as string) || null,
          dpaExpiration: (tool.dpa_expiration as string) || null,
        }))
      );
      setLoading(false);
    }

    load();
  }, []);

  const playbook = [
    "Schedule annual reviews for approved tools",
    "Track DPA and contract renewal dates",
    "Flag candidates for retirement or replacement",
    "Warn teachers before sunset deadlines",
    "Point staff to approved alternatives",
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Lifecycle Workspace
        </p>
        <h1 className="text-3xl font-semibold">Lifecycle and renewal management</h1>
        <p className="text-muted max-w-3xl">
          Keep the library healthy over time. This workspace surfaces expiring
          agreements and retirement signals so the district portfolio does not
          quietly drift into risk.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Approved tools</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.approved}</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Expiring within 90 days</p>
          <p className="text-3xl font-semibold">
            {loading ? "-" : stats.expiringSoon}
          </p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted mb-1">Retired tools</p>
          <p className="text-3xl font-semibold">{loading ? "-" : stats.retired}</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Renewal queue</h2>
            <Link href="/dashboard/tools" className="text-sm text-primary font-medium">
              Open tool library
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : expiringTools.length === 0 ? (
            <p className="text-sm text-muted">
              No approved tools have DPA expirations in the next 90 days.
            </p>
          ) : (
            <div className="space-y-3">
              {expiringTools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-xl border border-border p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{tool.name}</p>
                    <p className="text-sm text-muted mt-1">
                      {tool.vendor || "Vendor not recorded"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      DPA expiration
                    </p>
                    <p className="text-sm font-medium">
                      {formatShortDate(tool.dpaExpiration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Lifecycle playbook</h2>
          <div className="space-y-3">
            {playbook.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border px-4 py-3 text-sm text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
