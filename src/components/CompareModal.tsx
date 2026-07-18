import { useMemo } from "react";
import { Star, X, FileDown, Award, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Vendor } from "@/lib/places.functions";
import { exportComparisonPDF } from "@/lib/export";
import { incrementCompareCount } from "@/lib/rfq-store";

function score(v: Vendor) {
  const r = v.rating ?? 0;
  const n = v.reviews ?? 0;
  return r * Math.log10(n + 10);
}

export function CompareModal({
  open,
  onOpenChange,
  vendors,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vendors: Vendor[];
  onRemove: (id: string) => void;
}) {
  const bestId = useMemo(() => {
    if (vendors.length === 0) return null;
    return vendors.slice().sort((a, b) => score(b) - score(a))[0].id;
  }, [vendors]);

  const handleExport = () => {
    incrementCompareCount();
    exportComparisonPDF(vendors);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Comparison</DialogTitle>
          <DialogDescription>
            {vendors.length} suppliers side by side. The AI-picked best supplier is highlighted.
          </DialogDescription>
        </DialogHeader>

        {vendors.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No vendors selected. Tick "Compare" on vendor cards.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Vendor</Th>
                  <Th>Rating</Th>
                  <Th>Reviews</Th>
                  <Th>Distance</Th>
                  <Th>Category</Th>
                  <Th>Phone</Th>
                  <Th>Website</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const isBest = v.id === bestId;
                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-border/60 ${isBest ? "bg-primary/5" : ""}`}
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          {isBest && <Award className="w-4 h-4 text-primary shrink-0" />}
                          <span className="font-medium">{v.name}</span>
                          {isBest && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                              Best
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        {v.rating !== null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            {v.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </Td>
                      <Td>{v.reviews ?? "–"}</Td>
                      <Td>{v.distanceKm ? `${v.distanceKm} km` : "–"}</Td>
                      <Td className="text-xs text-muted-foreground capitalize">{v.category ?? "–"}</Td>
                      <Td className="text-xs">{v.phone ?? "–"}</Td>
                      <Td>
                        {v.website ? (
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                          >
                            Visit <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => onRemove(v.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleExport} disabled={vendors.length === 0} className="gap-2">
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}
