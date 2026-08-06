"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = "places" | "maps";

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

type SearchSummary = {
  queryCount: number;
  pagesFetched: number;
  rawResults: number;
  duplicatesRemoved: number;
};

const defaultKeywords = [
  "e-bike shop",
  "electric bike store",
  "negozio e-bike",
  "bici elettriche",
  "biciclette elettriche",
  "e-bike rental",
].join("\n");

const defaultAreas = [
  "Milano, Lombardia, Italy",
  "Torino, Piemonte, Italy",
  "Bergamo, Lombardia, Italy",
  "Brescia, Lombardia, Italy",
  "Verona, Veneto, Italy",
  "Padova, Veneto, Italy",
  "Venezia, Veneto, Italy",
  "Bologna, Emilia-Romagna, Italy",
  "Genova, Liguria, Italy",
  "Trento, Trentino-Alto Adige, Italy",
  "Bolzano, Trentino-Alto Adige, Italy",
].join("\n");

const sampleLeads: Lead[] = [
  {
    id: "sample-milano",
    name: "Sample E-Bike Milano",
    phone: "+39 02 0000 1000",
    internationalPhone: "+39 02 0000 1000",
    address: "Milano, Lombardia, Italy",
    website: "https://example.com/milano",
    mapsUrl: "https://maps.google.com/?q=e-bike+Milano",
    rating: 4.6,
    reviews: 142,
    lat: 45.4642,
    lng: 9.19,
    businessStatus: "OPERATIONAL",
    types: ["bicycle_store", "store"],
    matchedKeywords: ["e-bike shop"],
    matchedAreas: ["Milano"],
  },
  {
    id: "sample-torino",
    name: "Sample Bike Torino",
    phone: "",
    internationalPhone: "",
    address: "Torino, Piemonte, Italy",
    website: "",
    mapsUrl: "https://maps.google.com/?q=e-bike+Torino",
    rating: 4.3,
    reviews: 76,
    lat: 45.0703,
    lng: 7.6869,
    businessStatus: "OPERATIONAL",
    types: ["bicycle_store"],
    matchedKeywords: ["bici elettriche"],
    matchedAreas: ["Torino"],
  },
  {
    id: "sample-verona",
    name: "Sample Electric Wheels Verona",
    phone: "+39 045 000 2000",
    internationalPhone: "+39 045 000 2000",
    address: "Verona, Veneto, Italy",
    website: "https://example.com/verona",
    mapsUrl: "https://maps.google.com/?q=e-bike+Verona",
    rating: 4.8,
    reviews: 51,
    lat: 45.4384,
    lng: 10.9916,
    businessStatus: "OPERATIONAL",
    types: ["store"],
    matchedKeywords: ["electric bike store"],
    matchedAreas: ["Verona"],
  },
];

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function compactStatus(status: string) {
  if (!status) return "未知";
  return status.replaceAll("_", " ").toLowerCase();
}

function mapPosition(lead: Lead) {
  const lat = lead.lat ?? 45.4;
  const lng = lead.lng ?? 9.2;
  const x = ((lng - 6.2) / (13.2 - 6.2)) * 100;
  const y = (1 - (lat - 43.5) / (46.8 - 43.5)) * 100;
  return {
    left: `${Math.min(94, Math.max(6, x))}%`,
    top: `${Math.min(90, Math.max(8, y))}%`,
  };
}

export default function Home() {
  const [provider, setProvider] = useState<Provider>("places");
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("places_api_key") ?? "";
  });
  const [rememberKey, setRememberKey] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("places_api_key"));
  });
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [areas, setAreas] = useState(defaultAreas);
  const [pages, setPages] = useState(2);
  const [languageCode, setLanguageCode] = useState("it");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (rememberKey && apiKey) {
      window.localStorage.setItem("places_api_key", apiKey);
    }
    if (!rememberKey) {
      window.localStorage.removeItem("places_api_key");
    }
  }, [apiKey, rememberKey]);

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (onlyWithPhone && !lead.phone && !lead.internationalPhone) return false;
      if (!term) return true;
      return [
        lead.name,
        lead.address,
        lead.phone,
        lead.website,
        lead.matchedKeywords.join(" "),
        lead.matchedAreas.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [leads, onlyWithPhone, query]);

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedId) ?? filteredLeads[0];

  const stats = useMemo(() => {
    const withPhone = leads.filter((lead) => lead.phone || lead.internationalPhone).length;
    const withWebsite = leads.filter((lead) => lead.website).length;
    return {
      total: leads.length,
      withPhone,
      withWebsite,
      shown: filteredLeads.length,
    };
  }, [filteredLeads.length, leads]);

  async function runSearch() {
    setMessage("");

    if (provider === "maps") {
      setMessage(
        "Google Maps 网页模式已预留入口，但第一版不会自动抓取网页。建议先使用 Places API；网页抓取容易不稳定，也需要你确认合规和频率限制。"
      );
      return;
    }

    if (!apiKey.trim()) {
      setMessage("请先输入 Google Places API key。");
      return;
    }

    const keywordList = splitLines(keywords);
    const areaList = splitLines(areas);

    if (!keywordList.length || !areaList.length) {
      setMessage("请至少保留一个搜索关键词和一个地区。");
      return;
    }

    setIsSearching(true);
    setSummary(null);
    setSelectedId("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          keywords: keywordList,
          areas: areaList,
          pages,
          languageCode,
        }),
      });

      const payload = (await response.json()) as {
        leads?: Lead[];
        summary?: SearchSummary;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "搜索失败，请检查 API key 和 Google Cloud 配置。");
      }

      setLeads(payload.leads ?? []);
      setSummary(payload.summary ?? null);
      setMessage(
        payload.leads?.length
          ? `搜索完成，已整理 ${payload.leads.length} 家商家。`
          : "搜索完成，但没有找到结果。可以扩大地区或换关键词。"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "搜索失败，请稍后再试。";
      setMessage(errorMessage);
    } finally {
      setIsSearching(false);
    }
  }

  function exportCsv() {
    const headers = [
      "Name",
      "Phone",
      "International Phone",
      "Address",
      "Website",
      "Google Maps",
      "Rating",
      "Reviews",
      "Latitude",
      "Longitude",
      "Business Status",
      "Matched Keywords",
      "Matched Areas",
      "Types",
    ];

    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.phone,
      lead.internationalPhone,
      lead.address,
      lead.website,
      lead.mapsUrl,
      lead.rating ?? "",
      lead.reviews ?? "",
      lead.lat ?? "",
      lead.lng ?? "",
      lead.businessStatus,
      lead.matchedKeywords.join("; "),
      lead.matchedAreas.join("; "),
      lead.types.join("; "),
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      "north-italy-ebike-leads.csv"
    );
  }

  async function exportExcel() {
    const response = await fetch("/api/export-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: filteredLeads }),
    });

    if (!response.ok) {
      setMessage("Excel 导出失败，请先用 CSV 导出。");
      return;
    }

    const blob = await response.blob();
    downloadBlob(blob, "north-italy-ebike-leads.xlsx");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17201c]">
      <section className="border-b border-[#d8d7cb] bg-[#fbfbf6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6d715f]">
              Northern Italy e-bike lead finder
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#17201c] sm:text-4xl">
              电动自行车商家搜索台
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c6258]">
              输入关键词和地区，用 Google Places API 批量搜索商家电话，并整理成可筛选、可导出的名单。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="结果" value={stats.total} />
            <Stat label="有电话" value={stats.withPhone} />
            <Stat label="有网站" value={stats.withWebsite} />
            <Stat label="当前显示" value={stats.shown} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="panel">
            <div className="section-title">
              <span>搜索来源</span>
            </div>
            <div className="segmented" role="radiogroup" aria-label="搜索来源">
              <button
                className={provider === "places" ? "active" : ""}
                type="button"
                onClick={() => setProvider("places")}
              >
                Places API
              </button>
              <button
                className={provider === "maps" ? "active" : ""}
                type="button"
                onClick={() => setProvider("maps")}
              >
                Maps 网页
              </button>
            </div>
            {provider === "maps" ? (
              <p className="mt-3 rounded-md border border-[#f0b35b] bg-[#fff7e7] px-3 py-2 text-sm leading-5 text-[#7a4d08]">
                网页模式已预留。直接抓取 Google Maps 页面通常不稳定，并可能受到 Google 条款、验证码和频率限制影响；第一版先不自动执行。
              </p>
            ) : null}
          </div>

          <div className="panel">
            <div className="section-title">
              <span>API 设置</span>
            </div>
            <label className="field-label" htmlFor="apiKey">
              Google Places API key
            </label>
            <input
              id="apiKey"
              className="input"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              disabled={provider !== "places"}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(event) => setRememberKey(event.target.checked)}
              />
              <span>只保存在这台电脑的浏览器中</span>
            </label>
          </div>

          <div className="panel">
            <div className="section-title">
              <span>搜索条件</span>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setKeywords(defaultKeywords);
                  setAreas(defaultAreas);
                }}
              >
                恢复默认
              </button>
            </div>
            <label className="field-label" htmlFor="keywords">
              关键词，每行一个
            </label>
            <textarea
              id="keywords"
              className="textarea"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              rows={6}
            />
            <label className="field-label" htmlFor="areas">
              地区，每行一个
            </label>
            <textarea
              id="areas"
              className="textarea"
              value={areas}
              onChange={(event) => setAreas(event.target.value)}
              rows={7}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label>
                <span className="field-label">每组最多页数</span>
                <select
                  className="input"
                  value={pages}
                  onChange={(event) => setPages(Number(event.target.value))}
                >
                  <option value={1}>1 页</option>
                  <option value={2}>2 页</option>
                  <option value={3}>3 页</option>
                </select>
              </label>
              <label>
                <span className="field-label">语言</span>
                <select
                  className="input"
                  value={languageCode}
                  onChange={(event) => setLanguageCode(event.target.value)}
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="zh-CN">中文</option>
                </select>
              </label>
            </div>
            <button
              className="primary-button mt-4"
              type="button"
              onClick={runSearch}
              disabled={isSearching}
            >
              {isSearching ? "正在搜索..." : "开始搜索"}
            </button>
            <button
              className="secondary-button mt-2"
              type="button"
              onClick={() => {
                setLeads(sampleLeads);
                setSummary({
                  queryCount: 3,
                  pagesFetched: 3,
                  rawResults: 3,
                  duplicatesRemoved: 0,
                });
                setMessage("已载入示例数据，用于预览界面和测试导出。");
              }}
            >
              载入示例数据
            </button>
            {message ? <p className="status-message">{message}</p> : null}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel map-panel">
              <div className="section-title">
                <span>北意大利点位</span>
                <span className="subtle">{filteredLeads.length} 个商家</span>
              </div>
              <div className="map-canvas" aria-label="搜索结果地图示意">
                <div className="map-label milan">Milano</div>
                <div className="map-label torino">Torino</div>
                <div className="map-label veneto">Veneto</div>
                <div className="map-label liguria">Liguria</div>
                {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    className={`map-pin ${selectedLead?.id === lead.id ? "selected" : ""}`}
                    style={mapPosition(lead)}
                    type="button"
                    title={lead.name}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <span />
                  </button>
                ))}
                {!filteredLeads.length ? (
                  <div className="empty-map">
                    <strong>等待搜索结果</strong>
                    <span>先输入 API key，然后搜索米兰、都灵等地区。</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="panel detail-panel">
              <div className="section-title">
                <span>商家详情</span>
              </div>
              {selectedLead ? (
                <div className="detail-stack">
                  <div>
                    <h2>{selectedLead.name}</h2>
                    <p>{selectedLead.address || "地址为空"}</p>
                  </div>
                  <InfoLine label="电话" value={selectedLead.phone || selectedLead.internationalPhone || "空"} />
                  <InfoLine
                    label="评分"
                    value={
                      selectedLead.rating
                        ? `${selectedLead.rating} / ${selectedLead.reviews ?? 0} reviews`
                        : "空"
                    }
                  />
                  <InfoLine label="状态" value={compactStatus(selectedLead.businessStatus)} />
                  <div className="link-row">
                    {selectedLead.mapsUrl ? (
                      <a href={selectedLead.mapsUrl} target="_blank" rel="noreferrer">
                        Google Maps
                      </a>
                    ) : null}
                    {selectedLead.website ? (
                      <a href={selectedLead.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    ) : null}
                  </div>
                  <div className="tag-list">
                    {selectedLead.matchedKeywords.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="empty-text">选择地图点或表格行后，这里会显示详情。</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <div>
                <div className="section-title table-title">
                  <span>商家名单</span>
                </div>
                {summary ? (
                  <p className="subtle">
                    查询 {summary.queryCount} 组，翻页 {summary.pagesFetched} 次，去重{" "}
                    {summary.duplicatesRemoved} 条。
                  </p>
                ) : null}
              </div>
              <div className="toolbar-actions">
                <input
                  className="search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="筛选名称、地址、关键词"
                />
                <label className="check-row compact">
                  <input
                    type="checkbox"
                    checked={onlyWithPhone}
                    onChange={(event) => setOnlyWithPhone(event.target.checked)}
                  />
                  <span>只看有电话</span>
                </label>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={exportCsv}
                  disabled={!filteredLeads.length}
                >
                  CSV
                </button>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={exportExcel}
                  disabled={!filteredLeads.length}
                >
                  Excel
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商家</th>
                    <th>电话</th>
                    <th>地址</th>
                    <th>评分</th>
                    <th>来源</th>
                    <th>链接</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={selectedLead?.id === lead.id ? "selected-row" : ""}
                      onClick={() => setSelectedId(lead.id)}
                    >
                      <td>
                        <strong>{lead.name}</strong>
                        <span>{compactStatus(lead.businessStatus)}</span>
                      </td>
                      <td>{lead.phone || lead.internationalPhone || "空"}</td>
                      <td>{lead.address || "空"}</td>
                      <td>{lead.rating ? `${lead.rating} (${lead.reviews ?? 0})` : "空"}</td>
                      <td>{lead.matchedKeywords.slice(0, 2).join(", ")}</td>
                      <td>
                        <div className="mini-links">
                          {lead.mapsUrl ? (
                            <a href={lead.mapsUrl} target="_blank" rel="noreferrer">
                              Maps
                            </a>
                          ) : null}
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer">
                              Web
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredLeads.length ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-table">暂无结果。搜索后会在这里显示商家列表。</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
