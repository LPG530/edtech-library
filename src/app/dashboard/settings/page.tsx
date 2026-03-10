"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  staff: "Staff",
};

const roleStyles: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  reviewer: "bg-blue-100 text-blue-800",
  staff: "bg-gray-100 text-gray-600",
};

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [districtSlug, setDistrictSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (!profile) return;

      setCurrentUser(profile);

      // Get district slug
      const { data: district } = await supabase
        .from("districts")
        .select("slug")
        .eq("id", profile.district_id)
        .single();
      if (district) setDistrictSlug(district.slug);

      // Get all users in the district
      const { data: districtUsers } = await supabase
        .from("users")
        .select("*")
        .eq("district_id", profile.district_id)
        .order("created_at");

      if (districtUsers) setUsers(districtUsers);
      setLoading(false);
    }
    load();
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const joinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${districtSlug}`
      : "";

  async function updateRole(userId: string, newRole: string) {
    if (!isAdmin || userId === currentUser?.id) return;

    const supabase = createClient();
    await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole as User["role"] } : u
      )
    );
  }

  async function removeUser(userId: string) {
    if (!isAdmin || userId === currentUser?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this user from the district?"
    );
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("users").delete().eq("id", userId);

    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function copyJoinLink() {
    navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Invite link */}
      {isAdmin && districtSlug && (
        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-2">Invite Link</h2>
          <p className="text-sm text-muted mb-3">
            Share this link with staff to let them create an account and join
            your district. New members join as Staff by default — you can
            change their role below.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={joinLink}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-gray-50 text-sm font-mono"
            />
            <button
              onClick={copyJoinLink}
              className="px-4 py-2.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white border border-border rounded-xl">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">
            District Members ({users.length})
          </h2>
        </div>

        <div className="divide-y divide-border">
          {users.map((u) => (
            <div
              key={u.id}
              className="px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-foreground">
                  {u.full_name}
                  {u.id === currentUser?.id && (
                    <span className="text-xs text-muted ml-2">(you)</span>
                  )}
                </p>
                <p className="text-sm text-muted">{u.email}</p>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && u.id !== currentUser?.id ? (
                  <>
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="staff">Staff</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeUser(u.id)}
                      className="text-sm text-danger hover:opacity-80 font-medium"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${roleStyles[u.role]}`}
                  >
                    {roleLabels[u.role]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
