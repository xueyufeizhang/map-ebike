type SearchPayload = {
  apiKey?: string;
  keywords?: string[];
  areas?: string[];
  pages?: number;
  languageCode?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
  types?: string[];
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  internationalPhone: string;
  address: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
  lat: number | null;
  lng: number | null;
  businessStatus: string;
  types: string[];
  matchedKeywords: string[];
  matchedAreas: string[];
};

const fieldMask = [
  "places.id",
  "places.displayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.formattedAddress",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.businessStatus",
  "places.types",
  "nextPageToken",
].join(",");

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 25);
}

function toLead(place: GooglePlace, keyword: string, area: string): Lead | null {
  const id = place.id?.trim();
  const name = place.displayName?.text?.trim();

  if (!id || !name) return null;

  return {
    id,
    name,
    phone: place.nationalPhoneNumber ?? "",
    internationalPhone: place.internationalPhoneNumber ?? "",
    address: place.formattedAddress ?? "",
    website: place.websiteUri ?? "",
    mapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviews: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    lat:
      typeof place.location?.latitude === "number"
        ? place.location.latitude
        : null,
    lng:
      typeof place.location?.longitude === "number"
        ? place.location.longitude
        : null,
    businessStatus: place.businessStatus ?? "",
    types: place.types ?? [],
    matchedKeywords: [keyword],
    matchedAreas: [area],
  };
}

function mergeUnique(target: string[], incoming: string) {
  if (!target.includes(incoming)) target.push(incoming);
}

async function pause(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SearchPayload;
    const apiKey = payload.apiKey?.trim() ?? "";
    const keywords = cleanList(payload.keywords);
    const areas = cleanList(payload.areas);
    const pages = Math.min(3, Math.max(1, Number(payload.pages) || 1));
    const languageCode = payload.languageCode?.trim() || "it";

    if (!apiKey) {
      return Response.json({ error: "Google Places API key is required." }, { status: 400 });
    }

    if (!keywords.length || !areas.length) {
      return Response.json(
        { error: "At least one keyword and one area are required." },
        { status: 400 }
      );
    }

    const byId = new Map<string, Lead>();
    let pagesFetched = 0;
    let rawResults = 0;

    for (const keyword of keywords) {
      for (const area of areas) {
        const textQuery = `${keyword} in ${area}`;
        let pageToken = "";

        for (let page = 0; page < pages; page += 1) {
          if (pageToken) {
            await pause(1200);
          }

          const googleResponse = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": fieldMask,
              },
              body: JSON.stringify({
                textQuery,
                pageSize: 20,
                pageToken: pageToken || undefined,
                languageCode,
                regionCode: "IT",
              }),
            }
          );

          const data = (await googleResponse.json()) as {
            places?: GooglePlace[];
            nextPageToken?: string;
            error?: { message?: string; status?: string };
          };

          if (!googleResponse.ok) {
            return Response.json(
              {
                error:
                  data.error?.message ||
                  "Google Places request failed. Check API key, billing, and Places API access.",
              },
              { status: googleResponse.status }
            );
          }

          pagesFetched += 1;
          rawResults += data.places?.length ?? 0;

          for (const place of data.places ?? []) {
            const lead = toLead(place, keyword, area);
            if (!lead) continue;

            const existing = byId.get(lead.id);
            if (existing) {
              mergeUnique(existing.matchedKeywords, keyword);
              mergeUnique(existing.matchedAreas, area);
            } else {
              byId.set(lead.id, lead);
            }
          }

          if (!data.nextPageToken) break;
          pageToken = data.nextPageToken;
        }
      }
    }

    const leads = Array.from(byId.values()).sort((a, b) => {
      const phoneScore = Number(Boolean(b.phone || b.internationalPhone)) - Number(Boolean(a.phone || a.internationalPhone));
      if (phoneScore !== 0) return phoneScore;
      return a.name.localeCompare(b.name);
    });

    return Response.json({
      leads,
      summary: {
        queryCount: keywords.length * areas.length,
        pagesFetched,
        rawResults,
        duplicatesRemoved: Math.max(0, rawResults - leads.length),
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected search error.",
      },
      { status: 500 }
    );
  }
}
