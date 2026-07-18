import { useEffect, useState } from "react";
import { Send, FileDown, Copy, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Vendor } from "@/lib/places.functions";
import {
  loadContact,
  saveContact,
  saveRfq,
  type ContactProfile,
} from "@/lib/rfq-store";
import { exportRfqPDF, exportRfqDOCX } from "@/lib/export";

export function RfqDialog({
  open,
  onOpenChange,
  vendor,
  defaultProduct,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vendor: Vendor;
  defaultProduct: string;
}) {
  const [contact, setContact] = useState<ContactProfile>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [product, setProduct] = useState(defaultProduct);
  const [quantity, setQuantity] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("Pune, Maharashtra");
  const [timeline, setTimeline] = useState("Within 2 weeks");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 days");
  const [warranty, setWarranty] = useState("Standard manufacturer warranty");
  const [gst, setGst] = useState("Please include GST breakdown");
  const [vendorEmail, setVendorEmail] = useState(vendor.email ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setContact(loadContact());
      setProduct(defaultProduct);
      setVendorEmail(vendor.email ?? "");
    }
  }, [open, defaultProduct, vendor.email]);

  const subject = `Request for Quotation – ${product || "Procurement Requirement"}`;

  const body = [
    `Dear Procurement Team,`,
    ``,
    `We would like to request a quotation for the following requirement.`,
    ``,
    `Vendor           : ${vendor.name}`,
    `Product          : ${product}`,
    `Quantity         : ${quantity || "TBD"}`,
    `Delivery Location: ${deliveryLocation}`,
    `Delivery Timeline: ${timeline}`,
    ``,
    `Please provide:`,
    `  • Unit Price`,
    `  • Bulk Discount`,
    `  • GST Details — ${gst}`,
    `  • Delivery Timeline`,
    `  • Warranty Information — ${warranty}`,
    `  • Payment Terms — ${paymentTerms}`,
    `  • Validity of Quotation`,
    ``,
    `We look forward to your response.`,
    ``,
    `Regards,`,
    contact.name || "Procurement Team",
    contact.company || "",
    contact.email || "",
    contact.phone || "",
    ``,
    `— Prepared with OpusProcureAI on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail.trim());
  const canSend = emailValid && product.trim() && quantity.trim();

  const persist = () => {
    saveContact(contact);
    saveRfq({
      vendorName: vendor.name,
      vendorEmail: vendorEmail.trim(),
      product: product.trim(),
      quantity: quantity.trim(),
      subject,
      body,
    });
  };

  const openInOutlook = () => {
    if (!canSend) return;
    persist();
    const to = encodeURIComponent(vendorEmail.trim());
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    // Attempt Outlook deep link, fall back to mailto after 700ms
    const outlookUrl = `ms-outlook://compose?to=${to}&subject=${s}&body=${b}`;
    const mailto = `mailto:${to}?subject=${s}&body=${b}`;
    let fallbackFired = false;
    const fallback = window.setTimeout(() => {
      fallbackFired = true;
      window.location.href = mailto;
    }, 700);
    try {
      window.location.href = outlookUrl;
    } catch {
      window.clearTimeout(fallback);
      window.location.href = mailto;
    }
    // If page hides quickly, Outlook probably handled it — clear the fallback
    const onHide = () => {
      if (!fallbackFired) window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onHide);
    };
    document.addEventListener("visibilitychange", onHide);
    onOpenChange(false);
  };

  const openMailto = () => {
    if (!canSend) return;
    persist();
    const mailto = `mailto:${encodeURIComponent(vendorEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    onOpenChange(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate RFQ — {vendor.name}</DialogTitle>
          <DialogDescription>
            Review and edit the RFQ. Sending opens a draft in Outlook (or your default mail client) — nothing is sent automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SectionLabel>Requirement</SectionLabel>
            <Field label="Product">
              <Input value={product} onChange={(e) => setProduct(e.target.value)} maxLength={200} />
            </Field>
            <Field label="Quantity">
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50 units" maxLength={80} />
            </Field>
            <Field label="Delivery Location">
              <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Timeline">
              <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Payment Terms">
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Warranty Request">
              <Input value={warranty} onChange={(e) => setWarranty(e.target.value)} maxLength={120} />
            </Field>
            <Field label="GST Request">
              <Input value={gst} onChange={(e) => setGst(e.target.value)} maxLength={120} />
            </Field>

            <SectionLabel className="pt-3">Your Contact</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name">
                <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} maxLength={100} />
              </Field>
              <Field label="Company">
                <Input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} maxLength={100} />
              </Field>
              <Field label="Email">
                <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} type="email" maxLength={255} />
              </Field>
              <Field label="Phone">
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} maxLength={30} />
              </Field>
            </div>

            <SectionLabel className="pt-3">Vendor Email</SectionLabel>
            <Input value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} placeholder="vendor@example.com" type="email" />
            {!emailValid && vendorEmail && (
              <p className="text-[11px] text-destructive">Enter a valid email address.</p>
            )}
          </div>

          <div className="space-y-2">
            <SectionLabel>Preview</SectionLabel>
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">{subject}</span>
              </div>
              <Textarea value={body} readOnly rows={22} className="text-xs font-mono bg-background" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exportRfqPDF({ vendorName: vendor.name, subject, body })} className="gap-1.5">
                <FileDown className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exportRfqDOCX({ vendorName: vendor.name, subject, body })} className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> DOCX
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={openMailto} disabled={!canSend}>
            Open default mail client
          </Button>
          <Button type="button" onClick={openInOutlook} disabled={!canSend} className="gap-2">
            <Send className="w-4 h-4" />
            Send via Outlook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] uppercase tracking-wider font-medium text-muted-foreground ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
