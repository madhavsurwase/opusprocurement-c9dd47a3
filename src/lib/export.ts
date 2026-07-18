import type { Vendor } from "./places.functions";

export async function exportVendorsXLSX(vendors: Vendor[], query: string) {
  const XLSX = await import("xlsx");
  const rows = vendors.map((v) => ({
    Name: v.name,
    Rating: v.rating ?? "",
    Reviews: v.reviews ?? "",
    Category: v.category ?? "",
    "Distance (km)": v.distanceKm ?? "",
    "Open Now": v.openNow === null ? "" : v.openNow ? "Yes" : "No",
    Phone: v.phone ?? "",
    Email: v.email ?? "",
    Website: v.website ?? "",
    Address: v.address,
    "Google Maps": v.mapsUrl,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendors");
  XLSX.writeFile(wb, `OpusProcureAI-Vendors-${sanitize(query)}.xlsx`);
}

export async function exportVendorsPDF(vendors: Vendor[], query: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("OpusProcureAI — Vendor List", 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Query: "${query}" · ${vendors.length} vendors · Pune, Maharashtra`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["Name", "Rating", "Reviews", "Category", "Dist (km)", "Phone", "Email", "Address"]],
    body: vendors.map((v) => [
      v.name,
      v.rating?.toFixed(1) ?? "-",
      v.reviews ?? "-",
      v.category ?? "-",
      v.distanceKm ?? "-",
      v.phone ?? "-",
      v.email ?? "-",
      v.address.slice(0, 60),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
  });
  doc.save(`OpusProcureAI-Vendors-${sanitize(query)}.pdf`);
}

export async function exportComparisonPDF(vendors: Vendor[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("OpusProcureAI — Vendor Comparison", 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [["Vendor", "Rating", "Reviews", "Distance", "Phone", "Website", "Category"]],
    body: vendors.map((v) => [
      v.name,
      v.rating?.toFixed(1) ?? "-",
      v.reviews ?? "-",
      v.distanceKm ? `${v.distanceKm} km` : "-",
      v.phone ?? "-",
      v.website ?? "-",
      v.category ?? "-",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
  });
  doc.save(`OpusProcureAI-Comparison.pdf`);
}

export async function exportRfqPDF(opts: {
  vendorName: string;
  subject: string;
  body: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Request for Quotation", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`To: ${opts.vendorName}`, 14, 26);
  doc.text(`Subject: ${opts.subject}`, 14, 32);
  doc.setDrawColor(200);
  doc.line(14, 36, 196, 36);
  doc.setTextColor(20);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(opts.body, 180);
  doc.text(lines, 14, 44);
  doc.save(`RFQ-${sanitize(opts.vendorName)}.pdf`);
}

export async function exportRfqDOCX(opts: {
  vendorName: string;
  subject: string;
  body: string;
}) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
  const { saveAs } = await import("file-saver");
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Request for Quotation",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "To: ", bold: true }),
              new TextRun(opts.vendorName),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Subject: ", bold: true }),
              new TextRun(opts.subject),
            ],
          }),
          new Paragraph({ text: "" }),
          ...opts.body.split("\n").map((line) => new Paragraph({ text: line })),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `RFQ-${sanitize(opts.vendorName)}.docx`);
}

function sanitize(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "export";
}
