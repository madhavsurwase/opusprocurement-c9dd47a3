import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SupplierType =
  | "all"
  | "manufacturer"
  | "wholesaler"
  | "distributor"
  | "retailer"
  | "authorized_dealer"
  | "oem"
  | "service_provider"
  | "importer"
  | "exporter";

export type BusinessCategory =
  | "electronics"
  | "office_supplies"
  | "industrial_equipment"
  | "electrical"
  | "mechanical"
  | "it_hardware"
  | "furniture"
  | "packaging"
  | "safety_equipment"
  | "chemicals";

export type MinRating = 0 | 3 | 3.5 | 4 | 4.5;
export type Distance = "5" | "10" | "25" | "any";
export type SortBy = "rating" | "reviews" | "nearest" | "alpha";

export type FilterState = {
  supplierType: SupplierType;
  categories: BusinessCategory[];
  minRating: MinRating;
  distance: Distance;
  sortBy: SortBy;
};

export const defaultFilters: FilterState = {
  supplierType: "all",
  categories: [],
  minRating: 0,
  distance: "any",
  sortBy: "rating",
};

const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "distributor", label: "Distributor" },
  { value: "retailer", label: "Retailer" },
  { value: "authorized_dealer", label: "Authorized Dealer" },
  { value: "oem", label: "OEM" },
  { value: "service_provider", label: "Service Provider" },
  { value: "importer", label: "Importer" },
  { value: "exporter", label: "Exporter" },
];

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "electronics", label: "Electronics" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "industrial_equipment", label: "Industrial Equipment" },
  { value: "electrical", label: "Electrical" },
  { value: "mechanical", label: "Mechanical" },
  { value: "it_hardware", label: "IT Hardware" },
  { value: "furniture", label: "Furniture" },
  { value: "packaging", label: "Packaging" },
  { value: "safety_equipment", label: "Safety Equipment" },
  { value: "chemicals", label: "Chemicals" },
];

const RATINGS: { value: MinRating; label: string }[] = [
  { value: 0, label: "Any Rating" },
  { value: 3, label: "3+ Stars" },
  { value: 3.5, label: "3.5+ Stars" },
  { value: 4, label: "4+ Stars" },
  { value: 4.5, label: "4.5+ Stars" },
];


const DISTANCES: { value: Distance; label: string }[] = [
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
  { value: "any", label: "Anywhere in Pune" },
];

const SORTS: { value: SortBy; label: string }[] = [
  { value: "rating", label: "Highest Rating" },
  { value: "reviews", label: "Most Reviews" },
  { value: "nearest", label: "Nearest" },
  { value: "alpha", label: "Alphabetical" },
];

const labelOf = <T extends string | number>(
  arr: { value: T; label: string }[],
  v: T,
) => arr.find((o) => o.value === v)?.label ?? String(v);

export function VendorFilters({
  filters,
  onChange,
  resultCount,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleCategory = (c: BusinessCategory) => {
    const has = filters.categories.includes(c);
    set(
      "categories",
      has ? filters.categories.filter((x) => x !== c) : [...filters.categories, c],
    );
  };


  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.supplierType !== "all")
    chips.push({
      key: "type",
      label: `Type: ${labelOf(SUPPLIER_TYPES, filters.supplierType)}`,
      onRemove: () => set("supplierType", "all"),
    });
  filters.categories.forEach((c) =>
    chips.push({
      key: `cat-${c}`,
      label: labelOf(CATEGORIES, c),
      onRemove: () => toggleCategory(c),
    }),
  );
  if (filters.minRating > 0)
    chips.push({
      key: "rating",
      label: `${filters.minRating}+ ★`,
      onRemove: () => set("minRating", 0),
    });
  if (filters.distance !== "any")
    chips.push({
      key: "distance",
      label: labelOf(DISTANCES, filters.distance),
      onRemove: () => set("distance", "any"),
    });
  if (filters.sortBy !== "rating")
    chips.push({
      key: "sort",
      label: `Sort: ${labelOf(SORTS, filters.sortBy)}`,
      onRemove: () => set("sortBy", "rating"),
    });

  const hasActive = chips.length > 0;

  return (
    <div className="card-elevated p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Filters</h3>
          <span className="text-xs text-muted-foreground">
            {resultCount} vendors
          </span>
        </div>
        {hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(defaultFilters)}
            className="h-7 text-xs gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Reset all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <FieldLabel label="Supplier Type">
          <Select
            value={filters.supplierType}
            onValueChange={(v) => set("supplierType", v as SupplierType)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPLIER_TYPES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>

        <FieldLabel label="Business Category">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full justify-between font-normal"
              >
                <span className="truncate">
                  {filters.categories.length === 0
                    ? "Any category"
                    : `${filters.categories.length} selected`}
                </span>
                <SlidersHorizontal className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="grid grid-cols-1 gap-1 max-h-72 overflow-auto">
                {CATEGORIES.map((c) => {
                  const checked = filters.categories.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCategory(c.value)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded text-sm text-left hover:bg-accent transition-colors",
                        checked && "bg-accent",
                      )}
                    >
                      <span>{c.label}</span>
                      {checked && (
                        <span className="text-primary text-xs font-semibold">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filters.categories.length > 0 && (
                <div className="pt-2 mt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set("categories", [])}
                    className="w-full h-7 text-xs"
                  >
                    Clear categories
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </FieldLabel>

        <FieldLabel label="Min Rating">
          <Select
            value={String(filters.minRating)}
            onValueChange={(v) => set("minRating", Number(v) as MinRating)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATINGS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>


        <FieldLabel label="Distance">
          <Select
            value={filters.distance}
            onValueChange={(v) => set("distance", v as Distance)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISTANCES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>

        <FieldLabel label="Sort By">
          <Select
            value={filters.sortBy}
            onValueChange={(v) => set("sortBy", v as SortBy)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>
      </div>

      {hasActive && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground self-center mr-1">
            Active:
          </span>
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 py-1 font-normal"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 rounded-sm hover:bg-background/60 p-0.5"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ============= Filter application =============

const SUPPLIER_KEYWORDS: Record<Exclude<SupplierType, "all">, string[]> = {
  manufacturer: ["manufactur", "factory", "industries", "works"],
  wholesaler: ["wholesale", "wholesaler"],
  distributor: ["distribut"],
  retailer: ["retail", "store", "shop"],
  authorized_dealer: ["authorized", "authorised", "dealer"],
  oem: ["oem", "original equipment"],
  service_provider: ["service", "services", "solution"],
  importer: ["import"],
  exporter: ["export"],
};

const CATEGORY_KEYWORDS: Record<BusinessCategory, string[]> = {
  electronics: ["electronic", "electronics"],
  office_supplies: ["office", "stationery", "stationary"],
  industrial_equipment: ["industrial", "equipment", "machinery"],
  electrical: ["electric", "electrical", "wire", "cable"],
  mechanical: ["mechanical", "engineering", "tools"],
  it_hardware: ["it", "computer", "laptop", "server", "hardware"],
  furniture: ["furniture", "chair", "desk", "table"],
  packaging: ["packag", "packing", "carton", "box"],
  safety_equipment: ["safety", "ppe", "helmet", "glove"],
  chemicals: ["chemical", "lab", "solvent"],
};

type LikeVendor = {
  name: string;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  website: string | null;
  phone: string | null;
};

export function applyFilters<T extends LikeVendor>(
  vendors: T[],
  filters: FilterState,
): T[] {
  let out = vendors.slice();

  if (filters.supplierType !== "all") {
    const kws = SUPPLIER_KEYWORDS[filters.supplierType];
    out = out.filter((v) => {
      const hay = `${v.name} ${v.category ?? ""}`.toLowerCase();
      return kws.some((k) => hay.includes(k));
    });
  }

  if (filters.categories.length > 0) {
    out = out.filter((v) => {
      const hay = `${v.name} ${v.category ?? ""}`.toLowerCase();
      return filters.categories.some((c) =>
        CATEGORY_KEYWORDS[c].some((k) => hay.includes(k)),
      );
    });
  }

  if (filters.minRating > 0) {
    out = out.filter((v) => (v.rating ?? 0) >= filters.minRating);
  }


  // Distance: we don't have coordinates from the Places response; all results
  // are already biased to a 25km radius around Pune. Narrower distance values
  // act as a soft hint and are not enforced here.

  switch (filters.sortBy) {
    case "reviews":
      out.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      break;
    case "alpha":
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "nearest":
      // No coordinates available — fall back to review count as a proxy for
      // local prominence within Pune.
      out.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      break;
    case "rating":
    default:
      out.sort((a, b) => {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        if (rb !== ra) return rb - ra;
        return (b.reviews ?? 0) - (a.reviews ?? 0);
      });
  }

  return out;
}
