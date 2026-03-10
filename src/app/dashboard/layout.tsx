"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User, District } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { dashboardNavItems } from "@/lib/dashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [district, setDistrict] = useState<District | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        const { data: dist } = await supabase
          .from("districts")
          .select("*")
          .eq("id", profile.district_id)
          .single();
        if (dist) setDistrict(dist);
      }
    }

    loadUser();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground">
            EdTech Library
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {district?.name || "Loading..."}
            </span>
            <span className="text-sm font-medium">
              {user?.full_name || ""}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-muted hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto">
          {dashboardNavItems
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-50 text-muted hover:text-foreground hover:bg-slate-100"
                  }`}
                  title={item.description}
                >
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
