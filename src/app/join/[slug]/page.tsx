"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinDistrictPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadDistrict() {
      const supabase = createClient();
      const { data } = await supabase
        .from("districts")
        .select("name")
        .eq("slug", slug)
        .single();

      if (data) {
        setDistrictName(data.name);
      } else {
        setNotFound(true);
      }
    }
    loadDistrict();
  }, [slug]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const supabase = createClient();

    // 1. Create auth user
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // 2. Sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but could not sign in: " + signInError.message);
      setIsLoading(false);
      return;
    }

    // 3. Join the district
    const { error: rpcError } = await supabase.rpc("join_district", {
      p_district_slug: slug,
      p_user_name: fullName,
      p_user_email: email,
    });

    if (rpcError) {
      setError(rpcError.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">District Not Found</h1>
          <p className="text-muted mb-4">
            No district exists with the URL &quot;{slug}&quot;.
          </p>
          <Link href="/" className="text-primary hover:text-primary-dark font-medium">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!districtName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-foreground">
            EdTech Library
          </Link>
          <p className="text-muted mt-2">
            Join <span className="font-medium text-foreground">{districtName}</span>
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@district.edu"
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isLoading ? "Joining..." : "Create Account & Join"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center space-y-2">
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
