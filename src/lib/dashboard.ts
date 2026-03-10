import { createClient } from "@/lib/supabase/client";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  adminOnly?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "District-wide health, priorities, and quick actions.",
  },
  {
    href: "/dashboard/approvals",
    label: "Approvals",
    description: "Tool intake, review workload, and rubric-linked vetting.",
  },
  {
    href: "/dashboard/requests",
    label: "Requests",
    description: "Teacher and staff submissions moving through review.",
  },
  {
    href: "/dashboard/tools",
    label: "Tool Library",
    description: "District-approved tools and core profile details.",
    adminOnly: true,
  },
  {
    href: "/dashboard/governance",
    label: "Governance",
    description: "Policy controls, DPA posture, and access guardrails.",
    adminOnly: true,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    description: "Adoption, utilization, and portfolio signals.",
    adminOnly: true,
  },
  {
    href: "/dashboard/lifecycle",
    label: "Lifecycle",
    description: "Renewals, review cycles, and retirement planning.",
    adminOnly: true,
  },
  {
    href: "/dashboard/communications",
    label: "Comms",
    description: "Program updates and rollout/change-management messaging.",
    adminOnly: true,
  },
  {
    href: "/dashboard/rubric",
    label: "Rubrics",
    description: "District evaluation framework and criteria management.",
    adminOnly: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "District membership and administrative controls.",
    adminOnly: true,
  },
];

export type DashboardContext = {
  districtId: string;
  districtName: string | null;
  districtSlug: string | null;
  userId: string;
  userName: string | null;
  role: string;
};

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, district_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return null;
  }

  const { data: district } = await supabase
    .from("districts")
    .select("name, slug")
    .eq("id", profile.district_id)
    .single();

  return {
    districtId: profile.district_id as string,
    districtName: (district?.name as string) || null,
    districtSlug: (district?.slug as string) || null,
    userId: profile.id as string,
    userName: (profile.full_name as string) || null,
    role: profile.role as string,
  };
}

export function formatShortDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}
