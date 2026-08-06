type SearchPayload = {
  keywords?: string[];
  areas?: string[];
  languageCode?: string;
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

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

function mergeUnique(target: string[], incoming: string) {
  if (!target.includes(incoming)) target.push(incoming);
}

function normalizeEscapedMapsText(value: string) {
  return value
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function placeNameFromUrl(url: string) {
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  const rawName = match?.[1] ?? "";
  return decodeURIComponent(rawName.replaceAll("+", " ")).trim();
}

function coordinatesNearUrl(source: string, url: string) {
  const index = source.indexOf(url);
  const nearby = index >= 0 ? source.slice(index, index + 1800) : url;
  const atMatch = nearby.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  const dataMatch = nearby.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    return { lat: Number(dataMatch[1]), lng: Number(dataMatch[2]) };
  }

  return { lat: null, lng: null };
}

function phoneNearUrl(source: string, url: string) {
  const index = source.indexOf(url);
  const nearby = index >= 0 ? source.slice(Math.max(0, index - 2000), index + 2800) : "";
  const phoneMatch = nearby.match(/(?:\+39[\s.-]?)?(?:0\d{1,4}[\s.-]?\d[\d\s.-]{4,}|3\d{2}[\s.-]?\d[\d\s.-]{5,})/);
  return phoneMatch?.[0].replace(/\s+/g, " ").trim() ?? "";
}

function phoneFromNestedData(value: unknown): { phone: string; internationalPhone: string } {
  const stack = [value];
  const seen = new Set<unknown>();

  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      const first = current[0];
      const second = current[1];

      if (
        typeof first === "string" &&
        Array.isArray(second) &&
        second.some((entry) => Array.isArray(entry) && String(entry[0]).startsWith("+39"))
      ) {
        const internationalPhone =
          second.find((entry) => Array.isArray(entry) && String(entry[0]).startsWith("+39"))?.[0] ?? "";
        return { phone: first, internationalPhone: String(internationalPhone) };
      }

      for (const item of current) stack.push(item);
    }
  }

  return { phone: "", internationalPhone: "" };
}

function unwrapGoogleUrl(value: unknown) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/url?q=")) return value.startsWith("http") ? value : "";

  const url = new URL(`https://www.google.com${value}`);
  return url.searchParams.get("q") ?? "";
}

function mapsSearchUrl(keyword: string, area: string, languageCode: string) {
  const query = encodeURIComponent(`${keyword} ${area}`);
  const language = encodeURIComponent(languageCode || "it");
  return `https://www.google.com/maps/search/${query}?hl=${language}&gl=it`;
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("\\u003d", "=")
    .replaceAll("\\u0026", "&");
}

function mapDataUrlsFromHtml(html: string) {
  const urls = new Set<string>();
  const pattern = /<link href="([^"]*tbm=map[^"]*)"[^>]*as="fetch"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const href = decodeHtmlAttribute(match[1]);
    urls.add(href.startsWith("http") ? href : `https://www.google.com${href}`);
  }

  return Array.from(urls).slice(0, 2);
}

function isPlaceArray(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    typeof value[10] === "string" &&
    typeof value[11] === "string" &&
    Array.isArray(value[9]) &&
    typeof value[9][2] === "number" &&
    typeof value[9][3] === "number"
  );
}

function leadsFromMapData(data: string, keyword: string, area: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(data.replace(/^\)\]\}'\n/, ""));
  } catch {
    return [];
  }

  const leads: Lead[] = [];
  const stack = [parsed];
  const seen = new Set<unknown>();

  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (isPlaceArray(current)) {
      const name = current[11].trim();
      const addressParts = Array.isArray(current[2])
        ? current[2].filter((item) => typeof item === "string")
        : [];
      const address =
        (typeof current[18] === "string" ? current[18] : "") ||
        addressParts.join(", ");
      const lat = current[9][2] as number;
      const lng = current[9][3] as number;
      const phone = phoneFromNestedData(current);

      leads.push({
        id: current[10],
        name,
        phone: phone.phone,
        internationalPhone: phone.internationalPhone,
        address,
        website: Array.isArray(current[7]) ? unwrapGoogleUrl(current[7][0]) : "",
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${name} ${address}`
        )}`,
        rating:
          Array.isArray(current[4]) && typeof current[4][7] === "number"
            ? current[4][7]
            : null,
        reviews: null,
        lat,
        lng,
        businessStatus: "",
        types: Array.isArray(current[13])
          ? current[13].filter((item) => typeof item === "string")
          : ["google_maps_web"],
        matchedKeywords: [keyword],
        matchedAreas: [area],
      });
    }

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    }
  }

  return leads;
}

function extractLeadsFromHtml(html: string, keyword: string, area: string) {
  const source = normalizeEscapedMapsText(html);
  const urls = new Set<string>();
  const pattern = /(?:https:\/\/www\.google\.com)?\/maps\/place\/[^"'<>\s]+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const rawUrl = match[0].startsWith("http")
      ? match[0]
      : `https://www.google.com${match[0]}`;
    const cleanUrl = rawUrl.split("&ved=")[0].split('",')[0];

    if (cleanUrl.includes("/maps/place/")) {
      urls.add(cleanUrl);
    }
  }

  return Array.from(urls)
    .slice(0, 30)
    .map((mapsUrl, index): Lead | null => {
      const name = placeNameFromUrl(mapsUrl);
      if (!name || name === "null") return null;

      const coordinates = coordinatesNearUrl(source, mapsUrl);
      const phone = phoneNearUrl(source, mapsUrl);

      return {
        id: mapsUrl || `${name}-${area}-${index}`,
        name,
        phone,
        internationalPhone: phone.startsWith("+39") ? phone : "",
        address: "",
        website: "",
        mapsUrl,
        rating: null,
        reviews: null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        businessStatus: "",
        types: ["google_maps_web"],
        matchedKeywords: [keyword],
        matchedAreas: [area],
      };
    })
    .filter((lead): lead is Lead => Boolean(lead));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SearchPayload;
    const keywords = cleanList(payload.keywords);
    const areas = cleanList(payload.areas);
    const languageCode = payload.languageCode?.trim() || "it";

    if (!keywords.length || !areas.length) {
      return Response.json(
        { error: "At least one keyword and one area are required." },
        { status: 400 }
      );
    }

    const byId = new Map<string, Lead>();
    const warnings: string[] = [];
    let rawResults = 0;

    for (const keyword of keywords) {
      for (const area of areas) {
        const response = await fetch(mapsSearchUrl(keyword, area, languageCode), {
          headers: {
            "Accept-Language": `${languageCode},it;q=0.9,en;q=0.8`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          warnings.push(`${keyword} / ${area}: Google Maps returned ${response.status}`);
          continue;
        }

        const html = await response.text();
        if (/captcha|unusual traffic|sorry\/index/i.test(html)) {
          warnings.push(`${keyword} / ${area}: Google Maps asked for verification.`);
          continue;
        }

        const mapDataUrls = mapDataUrlsFromHtml(html);
        const leadsFromData: Lead[] = [];

        for (const mapDataUrl of mapDataUrls) {
          const mapDataResponse = await fetch(mapDataUrl, {
            headers: {
              "Accept-Language": `${languageCode},it;q=0.9,en;q=0.8`,
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            },
          });

          if (!mapDataResponse.ok) continue;
          const mapData = await mapDataResponse.text();
          leadsFromData.push(...leadsFromMapData(mapData, keyword, area));
        }

        const leads = leadsFromData.length
          ? leadsFromData
          : extractLeadsFromHtml(html, keyword, area);
        rawResults += leads.length;

        for (const lead of leads) {
          const existing = byId.get(lead.id);
          if (existing) {
            mergeUnique(existing.matchedKeywords, keyword);
            mergeUnique(existing.matchedAreas, area);
            if (!existing.phone && lead.phone) existing.phone = lead.phone;
            if (!existing.internationalPhone && lead.internationalPhone) {
              existing.internationalPhone = lead.internationalPhone;
            }
          } else {
            byId.set(lead.id, lead);
          }
        }
      }
    }

    const leads = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      leads,
      warnings,
      summary: {
        queryCount: keywords.length * areas.length,
        pagesFetched: keywords.length * areas.length,
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
            : "Unexpected Google Maps web search error.",
      },
      { status: 500 }
    );
  }
}
