type Lead = {
  name?: string;
  phone?: string;
  internationalPhone?: string;
  address?: string;
  website?: string;
  mapsUrl?: string;
  rating?: number | null;
  reviews?: number | null;
  lat?: number | null;
  lng?: number | null;
  businessStatus?: string;
  matchedKeywords?: string[];
  matchedAreas?: string[];
  types?: string[];
};

const encoder = new TextEncoder();

const columns = [
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

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - remainder) / 26);
  }
  return name;
}

function leadToRow(lead: Lead) {
  return [
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
    lead.matchedKeywords?.join("; "),
    lead.matchedAreas?.join("; "),
    lead.types?.join("; "),
  ];
}

function worksheetXml(leads: Lead[]) {
  const rows = [columns, ...leads.map(leadToRow)];
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowNumber}`;
          return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="3" width="22" customWidth="1"/>
    <col min="4" max="6" width="42" customWidth="1"/>
    <col min="7" max="10" width="14" customWidth="1"/>
    <col min="11" max="14" width="26" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

const staticFiles = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
  "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>`,
  "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Italy E-Bike Leads</dc:title>
  <dc:creator>Codex</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`,
  "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="E-Bike Leads" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
};

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crcTable = makeCrcTable();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(files: Record<string, string>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);

    writeUInt32(localHeader, 0, 0x04034b50);
    writeUInt16(localHeader, 4, 20);
    writeUInt16(localHeader, 6, 0);
    writeUInt16(localHeader, 8, 0);
    writeUInt16(localHeader, 10, 0);
    writeUInt16(localHeader, 12, 0);
    writeUInt32(localHeader, 14, checksum);
    writeUInt32(localHeader, 18, contentBytes.length);
    writeUInt32(localHeader, 22, contentBytes.length);
    writeUInt16(localHeader, 26, nameBytes.length);
    writeUInt16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUInt32(centralHeader, 0, 0x02014b50);
    writeUInt16(centralHeader, 4, 20);
    writeUInt16(centralHeader, 6, 20);
    writeUInt16(centralHeader, 8, 0);
    writeUInt16(centralHeader, 10, 0);
    writeUInt16(centralHeader, 12, 0);
    writeUInt16(centralHeader, 14, 0);
    writeUInt32(centralHeader, 16, checksum);
    writeUInt32(centralHeader, 20, contentBytes.length);
    writeUInt32(centralHeader, 24, contentBytes.length);
    writeUInt16(centralHeader, 28, nameBytes.length);
    writeUInt16(centralHeader, 30, 0);
    writeUInt16(centralHeader, 32, 0);
    writeUInt16(centralHeader, 34, 0);
    writeUInt16(centralHeader, 36, 0);
    writeUInt32(centralHeader, 38, 0);
    writeUInt32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  writeUInt32(end, 0, 0x06054b50);
  writeUInt16(end, 8, centralParts.length);
  writeUInt16(end, 10, centralParts.length);
  writeUInt32(end, 12, centralDirectory.length);
  writeUInt32(end, 16, offset);

  return concatBytes([...localParts, centralDirectory, end]);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { leads?: Lead[] };
  const leads = Array.isArray(payload.leads) ? payload.leads : [];
  const xlsx = createZip({
    ...staticFiles,
    "xl/worksheets/sheet1.xml": worksheetXml(leads),
  });

  return new Response(xlsx, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="italy-ebike-leads.xlsx"',
    },
  });
}
