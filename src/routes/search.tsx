import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Sparkles,
  Loader2,
  AlertCircle,
  Building2,
  Award,
  Check,
  X,
  ThumbsUp,
  AlertTriangle,
  Clock,
  FileDown,
  FileSpreadsheet,
  GitCompare,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  VendorFilters,
  applyFilters,
  defaultFilters,
  type FilterState,
  type BusinessCategory,
  type MinRating,
  type Distance,
  type SupplierType,
} from "@/components/VendorFilters";
import { sendProcurementEmail } from "@/lib/send-email";
import { CompareModal } from "@/components/CompareModal";
import { searchVendors, type Vendor, type SearchResult, type AiRecommendation } from "@/lib/places.functions";
import { pushHistory } from "@/lib/history";
import { exportVendorsPDF, exportVendorsXLSX } from "@/lib/export";
import { z } from "zod";

const EXAMPLES = [
  "Laptop",
  "Printer",
  "Office Chair",
  "Industrial Sensor",
  "Electrical Cable",
  "UPS Battery",
  "Server Rack",
];

const searchSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  rating: z.string().optional(),
  distance: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Vendor Search — OpusProcureAI" },
      {
        name: "description",
        content:
          "Discover verified procurement vendors in Pune with AI-powered ranking, comparisons, and RFQ generation.",
      },
      { property: "og:title", content: "Vendor Search — OpusProcureAI" },
      {
        property: "og:description",
        content: "AI-ranked supplier discovery for enterprise procurement in Pune.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const fn = useServerFn(searchVendors);
  const [query, setQuery] = useState(params.q ?? "");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...defaultFilters,
    supplierType: (params.type as SupplierType) ?? defaultFilters.supplierType,
    categories: params.category ? [params.category as BusinessCategory] : [],
    minRating: params.rating ? (Number(params.rating) as MinRating) : defaultFilters.minRating,
    distance: (params.distance as Distance) ?? defaultFilters.distance,
    sortBy: defaultFilters.sortBy,
  }));
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const filteredVendors = useMemo(
    () => (result ? applyFilters(result.vendors, filters) : []),
    [result, filters],
  );

  const compareVendors = useMemo(
    () => (result ? result.vendors.filter((v) => compareIds.includes(v.id)) : []),
    [result, compareIds],
  );

  const mutation = useMutation({
    mutationFn: (q: string) => fn({ data: { query: q } }),
    onSuccess: (data) => {
      setResult(data);
      setCompareIds([]);
      pushHistory({
        query: data.query,
        vendorCount: data.vendors.length,
        recommendation: data.recommendation,
      });
    },
  });

  const handleSearch = (q?: string) => {
    const value = (q ?? query).trim();
    if (!value) return;
    setQuery(value);
    mutation.mutate(value);
  };

  // Auto-run when arriving with ?q=
  useEffect(() => {
    if (params.q && params.q.trim() && !result && !mutation.isPending) {
      handleSearch(params.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Procurement Discovery
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Vendor Search</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search verified suppliers in <span className="font-medium text-foreground">Pune, Maharashtra</span>.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-5"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What product do you want to procure?"
                className="pl-9 h-11 text-base"
              />
            </div>
            <Button type="submit" disabled={mutation.isPending || !query.trim()} className="h-11 px-6 gap-2">
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Find Vendors
                </>
              )}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-muted-foreground self-center mr-1">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleSearch(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </motion.div>

        {mutation.isError && (
          <div className="card-elevated p-4 border-destructive/30 bg-destructive/5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-destructive">Search failed</div>
              <div className="text-muted-foreground mt-0.5">
                {(mutation.error as Error)?.message ?? "Please try again."}
              </div>
            </div>
          </div>
        )}

        {mutation.isPending && <ResultsSkeleton />}

        <AnimatePresence mode="wait">
          {result && !mutation.isPending && (
            <motion.div
              key={result.query}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {result.recommendation && (
                <RecommendationCard rec={result.recommendation} />
              )}

              <VendorFilters
                filters={filters}
                onChange={setFilters}
                resultCount={filteredVendors.length}
              />

              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {filteredVendors.length} of {result.vendors.length} vendors
                    for "{result.query}"
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => exportVendorsXLSX(filteredVendors, result.query)}
                      disabled={filteredVendors.length === 0}
                      className="gap-1.5 h-8"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => exportVendorsPDF(filteredVendors, result.query)}
                      disabled={filteredVendors.length === 0}
                      className="gap-1.5 h-8"
                    >
                      <FileDown className="w-3.5 h-3.5" /> PDF
                    </Button>
                  </div>
                </div>
                {result.vendors.length === 0 ? (
                  <div className="card-elevated p-10 text-center text-muted-foreground">
                    No vendors found in Pune for this query. Try a different term.
                  </div>
                ) : filteredVendors.length === 0 ? (
                  <div className="card-elevated p-10 text-center text-muted-foreground">
                    No vendors match the current filters.
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters(defaultFilters)}
                      >
                        Reset filters
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredVendors.map((v, i) => (
                      <VendorCard
                        key={v.id}
                        vendor={v}
                        index={i}
                        query={result.query}
                        inCompare={compareIds.includes(v.id)}
                        onToggleCompare={() => toggleCompare(v.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {compareIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 card-elevated px-4 py-3 flex items-center gap-4 shadow-lg border-primary/30"
          >
            <span className="text-sm font-medium">
              {compareIds.length} vendor{compareIds.length > 1 ? "s" : ""} selected
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setCompareOpen(true)}
              disabled={compareIds.length < 2}
              className="gap-1.5"
            >
              <GitCompare className="w-4 h-4" /> Compare
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCompareIds([])}
              className="gap-1.5"
            >
              <X className="w-4 h-4" /> Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <CompareModal
        open={compareOpen}
        onOpenChange={setCompareOpen}
        vendors={compareVendors}
        onRemove={(id) => setCompareIds((p) => p.filter((x) => x !== id))}
      />
    </AppShell>
  );
}

function RecommendationCard({ rec }: { rec: AiRecommendation }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="card-elevated overflow-hidden border-0"
    >
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-glow)] text-white p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-white/20 px-2 py-1 rounded">
                AI Recommended Supplier
              </span>
              <span className="text-[11px] text-white/80">Confidence {rec.confidence}%</span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{rec.vendorName}</h3>
            <p className="text-sm text-white/90 mt-1">{rec.summary}</p>
          </div>
        </div>
      </div>
      <div className="bg-card p-5 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-3">
            Why this vendor
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {rec.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Award className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {(rec.advantages?.length ?? 0) + (rec.risks?.length ?? 0) > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {rec.advantages?.length > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
                <div className="text-xs uppercase tracking-wider font-medium text-green-700 mb-2 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" /> Advantages
                </div>
                <ul className="space-y-1.5">
                  {rec.advantages.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rec.risks?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <div className="text-xs uppercase tracking-wider font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Risks to consider
                </div>
                <ul className="space-y-1.5">
                  {rec.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rec.confidence}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full gradient-primary"
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">{rec.confidence}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VendorCard({
  vendor,
  index,
  query,
  inCompare,
  onToggleCompare,
}: {
  vendor: Vendor;
  index: number;
  query: string;
  inCompare: boolean;
  onToggleCompare: () => void;
}) {
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className={`card-elevated p-5 relative ${inCompare ? "ring-2 ring-primary/40" : ""}`}
    >
      {vendor.topRecommended && (
        <span className="absolute -top-2 right-4 text-[10px] uppercase tracking-wider font-semibold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-glow)] text-white px-2.5 py-1 rounded-full shadow-sm">
          ★ Top Recommended
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold tracking-tight truncate">{vendor.name}</h3>
          {vendor.category && (
            <div className="text-xs text-muted-foreground capitalize mt-0.5 truncate">
              {vendor.category}
            </div>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
          <Checkbox checked={inCompare} onCheckedChange={onToggleCompare} />
          Compare
        </label>
      </div>

      <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
        {vendor.rating !== null ? (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
            <span className="text-muted-foreground text-xs">
              ({vendor.reviews ?? 0} reviews)
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No ratings yet</span>
        )}
        {vendor.distanceKm !== null && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {vendor.distanceKm} km
          </span>
        )}
        {vendor.openNow !== null && (
          <span
            className={`text-xs inline-flex items-center gap-1 ${vendor.openNow ? "text-green-600" : "text-muted-foreground"}`}
          >
            <Clock className="w-3 h-3" /> {vendor.openNow ? "Open now" : "Closed"}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{vendor.address}</span>
        </div>
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
            <span>{vendor.phone}</span>
          </a>
        )}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </a>
        )}
        {vendor.website && (
          <a href={vendor.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline truncate">
            <Globe className="w-4 h-4 shrink-0" />
            <span className="truncate">{vendor.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
        <a
          href={vendor.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on Google Maps
        </a>
        <Button
          type="button"
          size="sm"
          onClick={() => sendProcurementEmail(vendor, query)}
          className="gap-1.5 h-8"
        >
          <Mail className="w-3.5 h-3.5" />
          Send Email
        </Button>
      </div>
    </motion.div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-elevated p-5 animate-pulse space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
          <div className="h-3 bg-muted rounded w-4/6" />
        </div>
      ))}
    </div>
  );
}
