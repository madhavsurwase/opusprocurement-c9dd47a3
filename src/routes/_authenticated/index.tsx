import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, Sparkles, TrendingUp, ArrowRight, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { loadHistory, type SearchHistoryEntry } from "@/lib/history";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Procurement Dashboard — Opus-Procure AI" },
      {
        name: "description",
        content:
          "Enterprise procurement dashboard: track searches, vendors found, and AI-powered supplier recommendations across Pune.",
      },
      { property: "og:title", content: "Procurement Dashboard — Opus-Procure AI" },
      {
        property: "og:description",
        content: "AI-powered enterprise procurement intelligence for Pune-based suppliers.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const totalSearches = history.length;
  const vendorsFound = history.reduce((sum, h) => sum + h.vendorCount, 0);
  const aiRecs = history.filter((h) => h.recommendedVendor).length;

  const stats = [
    {
      label: "Total Searches",
      value: totalSearches,
      icon: Search,
      accent: "from-blue-500 to-blue-600",
    },
    {
      label: "Vendors Found",
      value: vendorsFound,
      icon: Users,
      accent: "from-indigo-500 to-indigo-600",
    },
    {
      label: "AI Recommendations",
      value: aiRecs,
      icon: Sparkles,
      accent: "from-sky-500 to-sky-600",
    },
    {
      label: "Active Region",
      value: "Pune",
      icon: TrendingUp,
      accent: "from-slate-500 to-slate-600",
    },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Procurement Intelligence
            </p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered supplier discovery across Pune, Maharashtra.
            </p>
          </div>
          <Link to="/search">
            <Button className="gap-2">
              <Search className="w-4 h-4" />
              New Vendor Search
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="card-elevated p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {s.label}
                    </div>
                    <div className="text-3xl font-semibold mt-2 tracking-tight">{s.value}</div>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2 card-elevated p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold tracking-tight">Recent Searches</h2>
                <p className="text-xs text-muted-foreground">Stored locally in this browser.</p>
              </div>
              <Link
                to="/search"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Start a new search <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No searches yet. Try discovering vendors for your next procurement need.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {history.slice(0, 6).map((h) => (
                  <li key={h.id} className="py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                      <Search className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{h.query}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.vendorCount} vendors ·{" "}
                        {new Date(h.timestamp).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {h.recommendedVendor && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                        AI Rec
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="card-elevated p-6 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-glow)] text-white border-0"
          >
            <Sparkles className="w-6 h-6 mb-3" />
            <h3 className="font-semibold tracking-tight">AI-powered procurement</h3>
            <p className="text-sm text-white/85 mt-2">
              Opus-Procure AI scans live Pune supplier data, ranks vendors, and recommends the best fit with a
              confidence score — instantly.
            </p>
            <Link to="/search" className="inline-flex items-center gap-1 text-sm font-medium mt-4 hover:underline">
              Try a search <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
