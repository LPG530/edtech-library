import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            EdTech Library
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto mb-8">
            A free, transparent catalog of approved educational technology tools
            for school districts. Browse what&apos;s approved, request new
            tools, and see the evaluation behind every decision.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/catalog"
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Browse the Catalog
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              District Login
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl border border-border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Public Catalog</h3>
            <p className="text-muted">
              Teachers, parents, and community members can browse every approved
              tool — no login required. Full transparency into what technology
              touches your students.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Request &amp; Approval
            </h3>
            <p className="text-muted">
              Staff can request new tools with a structured justification.
              Reviewers evaluate requests using a consistent rubric. No more
              email chains.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Evaluation Rubric
            </h3>
            <p className="text-muted">
              Build your district&apos;s own evaluation framework. Score tools
              on privacy, accessibility, equity, and curriculum alignment —
              with weighted categories.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted text-sm">
            Built for public education. Free forever.
          </p>
        </div>
      </main>
    </div>
  );
}
