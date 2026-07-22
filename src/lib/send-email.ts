import type { Vendor } from "@/lib/places.functions";

export const PROCUREMENT_EMAIL = "procurement@opusprocure.com";

export function buildProcurementEmail(
  vendor: Vendor,
  product: string,
  quantity?: string | null,
) {
  const subject = `Procurement Inquiry – ${product}`;
  const qtyBlock = quantity && quantity.trim() ? `\n\nQuantity:\n${quantity.trim()}` : "";
  const body = `Dear Sir/Madam,

We are currently looking to procure the following item for our organization.

Product:
${product}${qtyBlock}

If your company is interested in supplying this requirement, kindly reach out to our Procurement Team using the email address below.

Procurement Email:
${PROCUREMENT_EMAIL}

We would be happy to discuss the requirement further and share additional details.

Thank you for your time.

Thanks & Regards,

Opus Procurement Team`;

  const to = vendor.email ?? "";
  const enc = encodeURIComponent;
  const query = `subject=${enc(subject)}&body=${enc(body)}`;
  const mailto = `mailto:${enc(to)}?${query}`;
  const outlook = `ms-outlook://compose?to=${enc(to)}&${query}`;
  return { subject, body, to, mailto, outlook };
}

/**
 * Opens the user's default mail client (Outlook if configured) with a
 * pre-filled procurement inquiry draft. Never sends automatically.
 */
export function sendProcurementEmail(
  vendor: Vendor,
  product: string,
  quantity?: string | null,
) {
  const { mailto, outlook } = buildProcurementEmail(vendor, product, quantity);

  // Try Outlook deep link first; fall back to mailto shortly after in case
  // Outlook isn't registered as a protocol handler.
  let fallbackFired = false;
  const timer = window.setTimeout(() => {
    fallbackFired = true;
    window.location.href = mailto;
  }, 600);

  const onHide = () => {
    if (!fallbackFired) window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHide);
  };
  document.addEventListener("visibilitychange", onHide);

  try {
    window.location.href = outlook;
  } catch {
    window.clearTimeout(timer);
    window.location.href = mailto;
  }
}
