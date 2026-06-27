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
};

export type AiRecommendation = {
  vendorId: string | null;
  vendorName: string;
  reasons: string[];
  confidence: number;
  summary: string;
};

export type SearchResult = {
  vendors: Vendor[];
  recommendation: AiRecommendation | null;
  query: string;
};

export const searchVendors = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<SearchResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Missing Google Maps or Lovable AI credentials.");
    }

    // Places API (New) - text search restricted to Pune
    const placesRes = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.types,places.businessStatus",
        },
        body: JSON.stringify({
          textQuery: `${data.query} suppliers dealers in Pune Maharashtra`,
          maxResultCount: 15,
          locationBias: {
            circle: {
              center: { latitude: 18.5204, longitude: 73.8567 },
              radius: 25000,
            },
          },
          regionCode: "IN",
        }),
      },
    );

    if (!placesRes.ok) {
      const text = await placesRes.text();
      throw new Error(`Places API error ${placesRes.status}: ${text.slice(0, 200)}`);
    }

    const placesData = (await placesRes.json()) as {
      places?: Array<{
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
      }>;
    };

    const vendors: Vendor[] = (placesData.places ?? [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => ({
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
      }));

    // Sort by rating desc, then reviews desc
    vendors.sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.reviews ?? 0) - (a.reviews ?? 0);
    });

    if (vendors.length === 0) {
      return { vendors, recommendation: null, query: data.query };
    }

    // Best-effort email scraping from vendor websites (top 8, parallel, short timeout)
    await Promise.all(
      vendors.slice(0, 8).map(async (v) => {
        if (!v.website) return;
        try {
          const candidates = [v.website];
          try {
            const u = new URL(v.website);
            candidates.push(`${u.origin}/contact`, `${u.origin}/contact-us`);
          } catch {
            // ignore invalid URL
          }
          for (const url of candidates) {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 4000);
            try {
              const res = await fetch(url, {
                signal: ctrl.signal,
                headers: { "User-Agent": "Mozilla/5.0 OpusProcureAI/1.0" },
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
        } catch {
          // ignore
        }
      }),
    );


    // AI recommendation
    let recommendation: AiRecommendation | null = null;
    try {
      const { generateText, Output } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(lovableKey);

      const topCandidates = vendors.slice(0, 8).map((v) => ({
        id: v.id,
        name: v.name,
        rating: v.rating,
        reviews: v.reviews,
        category: v.category,
        address: v.address,
        hasWebsite: !!v.website,
        hasPhone: !!v.phone,
      }));

      const RecSchema = z.object({
        vendorId: z.string(),
        vendorName: z.string(),
        reasons: z.array(z.string()).min(2).max(5),
        confidence: z.number().min(0).max(100),
        summary: z.string(),
      });

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: RecSchema }),
        prompt: `You are an enterprise procurement analyst. From the following vendors in Pune, Maharashtra, recommend the single best supplier for "${data.query}". Consider rating, review count, category fit, and contactability.

Vendors:
${JSON.stringify(topCandidates, null, 2)}

Return the vendorId (exact match from the list), vendorName, 3-5 concise bullet reasons (e.g. "Highest rating", "450+ reviews", "Authorized dealer", "Strong local presence"), a confidence score (0-100), and a 1-sentence summary.`,
      });

      recommendation = output;
      const match = vendors.find((v) => v.id === output.vendorId);
      if (match) match.topRecommended = true;
      else if (vendors[0]) vendors[0].topRecommended = true;
    } catch (err) {
      console.error("AI recommendation failed", err);
      // Fallback: pick the top-sorted vendor
      const top = vendors[0];
      top.topRecommended = true;
      recommendation = {
        vendorId: top.id,
        vendorName: top.name,
        reasons: [
          top.rating ? `Highest rating: ${top.rating.toFixed(1)} ★` : "Strong local presence",
          top.reviews ? `${top.reviews}+ verified reviews` : "Established vendor",
          "Located in Pune, Maharashtra",
          top.website ? "Verified online presence" : "Reachable by phone",
        ],
        confidence: 80,
        summary: `${top.name} stands out among Pune suppliers based on rating and review volume.`,
      };
    }

    return { vendors, recommendation, query: data.query };
  });
