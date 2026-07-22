import type { Vendor } from "@/lib/places.functions";

export const PROCUREMENT_EMAIL = "procurement@opusprocure.com";

export function buildProcurementEmail(
  vendor: Vendor,
  product: string,
  quantity?: string | null,
) {
  const subject = `Procurement Inquiry – ${product}`;
  const qty = quantity && quantity.trim() ? quantity.trim() : "";
  const body = `Dear Sir/Madam,

We are currently looking to procure the following item for our organization.

Product:
${product}

${qty ? `Quantity:
${qty}

` : ""}If your company is interested in supplying this requirement, kindly reach out to our Procurement Team using the email address below.

Procurement Email:
${PROCUREMENT_EMAIL}

We would be happy to discuss the requirement further and share additional details.

Thank you for your time.

Thanks & Regards,

Opus Procurement Team`;

  const to = vendor.email ?? "";
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, to, mailto };
}

/**
 * Opens the user's default mail client (Outlook if configured as the default
 * mailto handler) with a pre-filled procurement inquiry draft. Never sends
 * automatically.
 */
export function sendProcurementEmail(
  vendor: Vendor,
  product: string,
  quantity?: string | null,
) {
  const { mailto } = buildProcurementEmail(vendor, product, quantity);
  window.location.href = mailto;
}
