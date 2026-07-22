import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  query: z.string().min(1).max(120),
});

export type Vendor = {
  id: string;
  name: string;
  rating: number | null;
  reviews: number | null;
  address: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  mapsUrl: string;
  category: string | null;
  topRecommended: boolean;
  openNow: boolean | null;
  distanceKm: number | null;
  businessStatus: string | null;
};

export type AiRecommendation = {
  vendorId: string | null;
  vendorName: string;
  reasons: string[];
  advantages: string[];
  risks: string[];
  confidence: number;
  summary: string;
};

export type SearchResult = {
  vendors: Vendor[];
  recommendation: AiRecommendation | null;
  query: string;
};

const PUNE = { lat: 18.5204, lng: 73.8567 };

function haversineKm(lat: number, lng: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat - PUNE.lat);
  const dLng = toRad(lng - PUNE.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(PUNE.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const searchVendors = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<SearchResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Missing Google Maps or Lovable AI credentials.");
    }

    type PlaceItem = {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      googleMapsUri?: string;
      primaryTypeDisplayName?: { text?: string };
      types?: string[];
      businessStatus?: string;
      location?: { latitude?: number; longitude?: number };
      currentOpeningHours?: { openNow?: boolean };
      regularOpeningHours?: { openNow?: boolean };
    };

    const queryVariants = [
      `${data.query} suppliers in Pune Maharashtra`,
      `${data.query} dealers in Pune`,
      `${data.query} wholesalers distributors Pune`,
      `${data.query} manufacturers Pune`,
      `${data.query} shop store Pune`,
    ];

    async function searchOnce(textQuery: string, pageToken?: string) {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey!,
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.types,places.businessStatus,places.location,places.currentOpeningHours,places.regularOpeningHours,nextPageToken",
          },
          body: JSON.stringify({
            textQuery,
            maxResultCount: 20,
            pageSize: 20,
            ...(pageToken ? { pageToken } : {}),
            locationBias: {
              circle: {
                center: { latitude: PUNE.lat, longitude: PUNE.lng },
                radius: 30000,
              },
            },
            regionCode: "IN",
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Places API error ${res.status}: ${text.slice(0, 200)}`);
      }
      return (await res.json()) as { places?: PlaceItem[]; nextPageToken?: string };
    }

    async function fetchAllPages(textQuery: string): Promise<PlaceItem[]> {
      const collected: PlaceItem[] = [];
      let token: string | undefined = undefined;
      for (let i = 0; i < 3; i++) {
        const page = await searchOnce(textQuery, token);
        if (page.places?.length) collected.push(...page.places);
        if (!page.nextPageToken) break;
        token = page.nextPageToken;
        await new Promise((r) => setTimeout(r, 1600));
      }
      return collected;
    }

    const allBatches = await Promise.all(queryVariants.map((q) => fetchAllPages(q)));
    const seen = new Map<string, PlaceItem>();
    for (const batch of allBatches) {
      for (const p of batch) if (!seen.has(p.id)) seen.set(p.id, p);
    }

    const vendors: Vendor[] = Array.from(seen.values())
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => {
        const lat = p.location?.latitude;
        const lng = p.location?.longitude;
        const distanceKm =
          typeof lat === "number" && typeof lng === "number"
            ? Math.round(haversineKm(lat, lng) * 10) / 10
            : null;
        return {
          id: p.id,
          name: p.displayName?.text ?? "Unknown",
          rating: p.rating ?? null,
          reviews: p.userRatingCount ?? null,
          address: p.formattedAddress ?? "",
          phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
          website: p.websiteUri ?? null,
          email: null,
          mapsUrl:
            p.googleMapsUri ??
            `https://www.google.com/maps/search/?api=1&query_place_id=${p.id}`,
          category:
            p.primaryTypeDisplayName?.text ??
            (p.types?.[0] ?? "").replace(/_/g, " ") ??
            null,
          topRecommended: false,
          openNow:
            p.currentOpeningHours?.openNow ??
            p.regularOpeningHours?.openNow ??
            null,
          distanceKm,
          businessStatus: p.businessStatus ?? null,
        };
      });

    vendors.sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.reviews ?? 0) - (a.reviews ?? 0);
    });

    if (vendors.length === 0) {
      return { vendors, recommendation: null, query: data.query };
    }

    // Best-effort email scraping (top 8, parallel)
    await Promise.all(
      vendors.slice(0, 8).map(async (v) => {
        if (!v.website) return;
        try {
          const candidates = [v.website];
          try {
            const u = new URL(v.website);
            candidates.push(`${u.origin}/contact`, `${u.origin}/contact-us`);
          } catch {}
          for (const url of candidates) {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 4000);
            try {
              const res = await fetch(url, {
                signal: ctrl.signal,
                headers: { "User-Agent": "Mozilla/5.0 Opus-Procure-AI/1.0" },
                redirect: "follow",
              });
              clearTimeout(t);
              if (!res.ok) continue;
              const html = (await res.text()).slice(0, 200_000);
              const mailto = html.match(/mailto:([^"'?\s>]+@[^"'?\s>]+)/i);
              const regex = html.match(
                /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
              );
              const found = (mailto?.[1] ?? regex?.[0] ?? "").toLowerCase().trim();
              if (
                found &&
                !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(found) &&
                !found.startsWith("example@") &&
                !found.includes("sentry") &&
                !found.includes("wixpress")
              ) {
                v.email = found;
                break;
              }
            } catch {
              clearTimeout(t);
            }
          }
        } catch {}
      }),
    );

    let recommendation: AiRecommendation | null = null;
    try {
      const { generateText, Output } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(lovableKey);

      const topCandidates = vendors.slice(0, 10).map((v) => ({
        id: v.id,
        name: v.name,
        rating: v.rating,
        reviews: v.reviews,
        category: v.category,
        distanceKm: v.distanceKm,
        openNow: v.openNow,
        hasWebsite: !!v.website,
        hasPhone: !!v.phone,
      }));

      const RecSchema = z.object({
        vendorId: z.string(),
        vendorName: z.string(),
        reasons: z.array(z.string()),
        advantages: z.array(z.string()),
        risks: z.array(z.string()),
        confidence: z.number(),
        summary: z.string(),
      });

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: RecSchema }),
        prompt: `You are an enterprise procurement analyst. From the following vendors in Pune, Maharashtra, recommend the single best supplier for "${data.query}". Consider rating, review count, category fit, distance, open-now status, and contactability.

Vendors:
${JSON.stringify(topCandidates, null, 2)}

Return:
- vendorId (exact match from the list)
- vendorName
- reasons: 3-5 concise bullet reasons for choosing this vendor
- advantages: 2-4 concrete advantages (e.g. "Highly rated 4.7 with 500+ reviews", "Only 3.2 km from central Pune")
- risks: 1-3 possible risks or considerations (e.g. "No public website — verify legitimacy by phone", "Small review count", "Currently closed — call during business hours")
- confidence: 0-100
- summary: one sentence`,
      });

      recommendation = output;
      const match = vendors.find((v) => v.id === output.vendorId);
      if (match) match.topRecommended = true;
      else if (vendors[0]) vendors[0].topRecommended = true;
    } catch (err) {
      console.error("AI recommendation failed", err);
      const top = vendors[0];
      top.topRecommended = true;
      recommendation = {
        vendorId: top.id,
        vendorName: top.name,
        reasons: [
          top.rating ? `Highest rating: ${top.rating.toFixed(1)} ★` : "Strong local presence",
          top.reviews ? `${top.reviews}+ verified reviews` : "Established vendor",
          "Located in Pune, Maharashtra",
        ],
        advantages: [
          top.website ? "Verified online presence" : "Reachable by phone",
          top.distanceKm ? `~${top.distanceKm} km from central Pune` : "Local supplier",
        ],
        risks: ["Automated selection — verify credentials before ordering"],
        confidence: 80,
        summary: `${top.name} stands out among Pune suppliers based on rating and review volume.`,
      };
    }

    return { vendors, recommendation, query: data.query };
  });
