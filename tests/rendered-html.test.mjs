import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the e-bike lead finder shell", async () => {
  const response = await request("/", {
    headers: { accept: "text/html" },
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Italy E-Bike Lead Finder<\/title>/i);
  assert.match(html, /电动自行车商家搜索台/);
  assert.match(html, /Places API/);
  assert.match(html, /Maps 网页/);
  assert.match(html, /地区选择/);
  assert.match(html, /Lombardia/);
  assert.match(html, /每页显示/);
  assert.match(html, /筛选/);
  assert.match(html, /商家名单/);
  assert.match(html, /示意图/);
  assert.match(html, /Google Map/);
  assert.doesNotMatch(html, /加入热门/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("search route validates missing Google Places API key", async () => {
  const response = await request("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      keywords: ["e-bike shop"],
      areas: ["Milano, Italy"],
      pages: 1,
    }),
  });

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /API key/i);
});

test("maps web route validates required search inputs", async () => {
  const response = await request("/api/search-maps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      keywords: [],
      areas: [],
    }),
  });

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /keyword/i);
});

test("xlsx export route returns a workbook download", async () => {
  const response = await request("/api/export-xlsx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      leads: [
        {
          name: "Sample E-Bike Milano",
          phone: "+39 02 0000 1000",
          address: "Milano, Italy",
          matchedKeywords: ["e-bike shop"],
          matchedAreas: ["Milano"],
        },
      ],
    }),
  });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /spreadsheetml\.sheet/i,
  );

  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(0, 2)), "PK");
});
