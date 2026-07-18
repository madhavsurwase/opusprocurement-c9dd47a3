export type RfqRecord = {
  id: string;
  vendorName: string;
  vendorEmail: string;
  product: string;
  quantity: string;
  subject: string;
  body: string;
  timestamp: number;
};

const RFQ_KEY = "opusprocure.rfqs.v1";
const COMPARE_KEY = "opusprocure.compare-count.v1";
const CONTACT_KEY = "opusprocure.contact.v1";

export type ContactProfile = {
  name: string;
  email: string;
  phone: string;
  company: string;
};

export function loadRfqs(): RfqRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RFQ_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveRfq(rfq: Omit<RfqRecord, "id" | "timestamp">): RfqRecord {
  const rec: RfqRecord = {
    ...rfq,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  const list = [rec, ...loadRfqs()].slice(0, 100);
  try {
    window.localStorage.setItem(RFQ_KEY, JSON.stringify(list));
  } catch {}
  return rec;
}

export function incrementCompareCount(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(COMPARE_KEY) ?? "0") + 1;
  try {
    window.localStorage.setItem(COMPARE_KEY, String(n));
  } catch {}
  return n;
}

export function getCompareCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(COMPARE_KEY) ?? "0");
}

export function loadContact(): ContactProfile {
  if (typeof window === "undefined")
    return { name: "", email: "", phone: "", company: "" };
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (!raw) return { name: "", email: "", phone: "", company: "" };
    return JSON.parse(raw);
  } catch {
    return { name: "", email: "", phone: "", company: "" };
  }
}

export function saveContact(c: ContactProfile) {
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(c));
  } catch {}
}
