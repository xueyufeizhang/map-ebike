# Italy E-Bike Lead Finder

A local web tool for collecting e-bike business leads in Italy. It can search
with Google Places API or an experimental Google Maps web source, display
results on a real Google Map, filter the lead list, and export CSV or Excel
files.

## Features

- Search by keyword and Italian city or region
- Choose between Places API and Google Maps web search
- Show results on Google Maps with selectable business markers
- Filter by area, keyword, phone, website, rating, and business status
- Load included example data for testing without API usage
- Export filtered results as CSV or XLSX

## Requirements

- Node.js `>=22.13.0`
- A Google API key with the relevant Maps services enabled

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal, usually:

```text
http://localhost:3000/
```

Stop the local server with `Ctrl + C`.

## API Key

Enter the Google API key in the app under `搜索来源 -> Places API`. If you choose
to remember it, the key is saved only in this browser's local storage.

## Useful Commands

```bash
npm run dev
npm run lint
npm test
npm run build
```
