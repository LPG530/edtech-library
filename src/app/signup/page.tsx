"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [districtName, setDistrictName] = useState("");
  const [slug, setSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  function handleDistrictNameChange(name: string) {
    setDistrictName(name);
    setSlug(generateSlug(name));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const supabase = createClient();

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account. Please try again.");
      setIsLoading(false);
      return;
    }

    // 2. Sign in immediately (signUp may auto-confirm depending on Supabase settings)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but could not sign in: " + signInError.message);
      setIsLoading(false);
      return;
    }

    // 3. Call the signup_district function to create district + profile
    const { error: rpcError } = await supabase.rpc("signup_district", {
      p_district_name: districtName,
      p_district_slug: slug,
      p_user_name: fullName,
      p_user_email: email,
    });

    if (rpcError) {
      if (rpcError.message.includes("duplicate key") && rpcError.message.includes("slug")) {
        setError("That district URL is already taken. Please choose a different name.");
      } else {
        setError(rpcError.message);
      }
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-foreground">
            EdTech Library
          </Link>
          <p className="text-muted mt-2">Set up your district&apos;s edtech library</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          {step === 1 && (
            <>
              <div className="bg-white border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">District Information</h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    District Name
                  </label>
                  <input
                    type="text"
                    required
                    value={districtName}
                    onChange={(e) => handleDistrictNameChange(e.target.value)}
                    placeholder="Springfield Unified School District"
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    District URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Your public catalog will be shareable at this URL
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!districtName.trim() || !slug.trim()) {
                    setError("Please fill in the district name and URL.");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-white border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Admin Account</h2>
                <p className="text-sm text-muted">
                  You&apos;ll be the first administrator for{" "}
                  <span className="font-medium text-foreground">{districtName}</span>.
                </p>

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
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Creating district..." : "Create District"}
                </button>
              </div>
            </>
          )}

          {step === 1 && error && <p className="text-sm text-danger">{error}</p>}
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center space-y-2">
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              Sign in
            </Link>
          </p>
          <Link
            href="/catalog"
            className="text-sm text-primary hover:text-primary-dark block"
          >
            Browse the public catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
