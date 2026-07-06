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
  Send,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  VendorFilters,
  applyFilters,
  defaultFilters,
  type FilterState,
} from "@/components/VendorFilters";
import { searchVendors, type Vendor, type SearchResult } from "@/lib/places.functions";
import { pushHistory } from "@/lib/history";

const EXAMPLES = [
  "Laptop",
  "Printer",
  "Office Chair",
  "Industrial Sensor",
  "Electrical Cable",
  "UPS Battery",
  "Server Rack",
];

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Vendor Search — OpusProcureAI" },
      {
        name: "description",
        content:
          "Discover verified procurement vendors in Pune with AI-powered ranking and recommendations.",
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
  const fn = useServerFn(searchVendors);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const filteredVendors = useMemo(
    () => (result ? applyFilters(result.vendors, filters) : []),
    [result, filters],
  );

  const mutation = useMutation({
    mutationFn: (q: string) => fn({ data: { query: q } }),
    onSuccess: (data) => {
      setResult(data);
      pushHistory({
        query: data.query,
        vendorCount: data.vendors.length,
        recommendation: data.recommendation,
      });
    },
  });

  useEffect(() => {
    document.title = "Vendor Search — OpusProcureAI";
  }, []);

  const handleSearch = (q?: string) => {
    const value = (q ?? query).trim();
    if (!value) return;
    setQuery(value);
    mutation.mutate(value);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
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
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {filteredVendors.length} of {result.vendors.length} vendors
                    for "{result.query}"
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Filters apply to results
                  </span>
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
                      <VendorCard key={v.id} vendor={v} index={i} query={result.query} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function RecommendationCard({ rec }: { rec: { vendorName: string; reasons: string[]; confidence: number; summary: string } }) {
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
              <span className="text-[11px] text-white/80">
                Confidence {rec.confidence}%
              </span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{rec.vendorName}</h3>
            <p className="text-sm text-white/90 mt-1">{rec.summary}</p>
          </div>
        </div>
      </div>
      <div className="bg-card p-5">
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
        <div className="mt-4 pt-4 border-t border-border">
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

function VendorCard({ vendor, index, query }: { vendor: Vendor; index: number; query: string }) {
  const [showForm, setShowForm] = useState(false);
  const [product, setProduct] = useState(query);
  const [quantity, setQuantity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [yourName, setYourName] = useState("");
  const [yourEmail, setYourEmail] = useState("");
  const [yourPhone, setYourPhone] = useState("");
  const [vendorEmailInput, setVendorEmailInput] = useState(vendor.email ?? "");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmailInput.trim());
  const canSend =
    emailValid &&
    product.trim().length > 0 &&
    quantity.trim().length > 0 &&
    yourName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(yourEmail.trim());

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const subject = `Quotation Request: ${product.trim()}`;
    const body = [
      `Dear ${vendor.name},`,
      ``,
      `We are interested in receiving a quotation for the following requirement:`,
      ``,
      `Product / Item : ${product.trim()}`,
      `Quantity       : ${quantity.trim()}`,
      deliveryDate ? `Required by    : ${deliveryDate}` : null,
      notes.trim() ? `` : null,
      notes.trim() ? `Additional notes:` : null,
      notes.trim() ? notes.trim() : null,
      ``,
      `If you are interested in participating in this requirement, please reach out to us at ${yourEmail.trim()}${yourPhone.trim() ? ` or ${yourPhone.trim()}` : ""}.`,
      ``,
      `Kindly share your best pricing, lead time, and payment terms at the earliest.`,
      ``,
      `Regards,`,
      yourName.trim(),
      yourEmail.trim(),
      yourPhone.trim(),
      `— Sent via OpusProcureAI`,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const mailto = `mailto:${encodeURIComponent(vendorEmailInput.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="card-elevated p-5 relative"
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
      </div>

      <div className="flex items-center gap-3 mt-3 text-sm">
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
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{vendor.address}</span>
        </div>
        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Phone className="w-4 h-4" />
            <span>{vendor.phone}</span>
          </a>
        )}
        {vendor.email && (
          <a
            href={`mailto:${vendor.email}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </a>
        )}
        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-primary hover:underline truncate"
          >
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
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm((s) => !s)}
          className="gap-1.5 h-8"
        >
          <Send className="w-3.5 h-3.5" />
          {showForm ? "Cancel" : "Request Quotation"}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showForm ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            key="quote-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSend}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                Quotation Request
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`vemail-${vendor.id}`} className="text-xs">
                  Vendor email {vendor.email ? "(auto-filled)" : "(not found — enter manually)"}
                </Label>
                <Input
                  id={`vemail-${vendor.id}`}
                  type="email"
                  value={vendorEmailInput}
                  onChange={(e) => setVendorEmailInput(e.target.value)}
                  placeholder="vendor@example.com"
                  maxLength={255}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`prod-${vendor.id}`} className="text-xs">
                  Product / Item
                </Label>
                <Input
                  id={`prod-${vendor.id}`}
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  maxLength={200}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`qty-${vendor.id}`} className="text-xs">
                    Quantity
                  </Label>
                  <Input
                    id={`qty-${vendor.id}`}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 25 units"
                    maxLength={50}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`date-${vendor.id}`} className="text-xs">
                    Required by
                  </Label>
                  <Input
                    id={`date-${vendor.id}`}
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`notes-${vendor.id}`} className="text-xs">
                  Additional specs (optional)
                </Label>
                <Textarea
                  id={`notes-${vendor.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  Your contact
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`yname-${vendor.id}`} className="text-xs">
                      Your name
                    </Label>
                    <Input
                      id={`yname-${vendor.id}`}
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      maxLength={100}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`yemail-${vendor.id}`} className="text-xs">
                      Your email
                    </Label>
                    <Input
                      id={`yemail-${vendor.id}`}
                      type="email"
                      value={yourEmail}
                      onChange={(e) => setYourEmail(e.target.value)}
                      maxLength={255}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`yphone-${vendor.id}`} className="text-xs">
                    Your phone (optional)
                  </Label>
                  <Input
                    id={`yphone-${vendor.id}`}
                    value={yourPhone}
                    onChange={(e) => setYourPhone(e.target.value)}
                    maxLength={30}
                    className="h-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!canSend}
                className="w-full gap-2 h-9 mt-1"
              >
                <Send className="w-3.5 h-3.5" />
                Open in email client
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                This opens your default email app with the message pre-filled.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card-elevated p-6 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="h-6 w-2/3 bg-muted rounded mb-2" />
        <div className="h-3 w-full bg-muted rounded" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated p-5 animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-5/6 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
