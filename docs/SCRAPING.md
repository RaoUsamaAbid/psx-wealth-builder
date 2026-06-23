# PSX Scraping — how it works & how to fix it

> **Read this first if market data looks wrong or the scraper tests fail.**
> PSX can change their website at any time; this doc is the map back to working.

## Why we scrape

The Pakistan Stock Exchange has **no free real-time API**. Licensed data feeds
are paid/contract-gated. So we read PSX's **public web pages** and parse them.
Data is pulled **on demand** (a "Sync" button), persisted to MongoDB, and every
calculation runs off the DB — we never poll.

There are **two sources**, both on the official data portal `dps.psx.com.pk`:

| Source       | URL                 | Gives us                                                                   | Parser                                                                                              |
| ------------ | ------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Market watch | `/market-watch`     | symbols, company names, **index membership**, sector code, **live prices** | [`packages/market-data/src/sync/constituents.ts`](../packages/market-data/src/sync/constituents.ts) |
| Company page | `/company/<SYMBOL>` | sector **name**, market cap, P/E, **EPS, EPS growth, revenue growth**      | [`packages/market-data/src/scraping/company.ts`](../packages/market-data/src/scraping/company.ts)   |

The flow: **Quick sync** (`POST /market/sync`) reads market-watch once and
replaces the universe + prices. **Deep sync** (`POST /market/sync/deep`,
background) walks each company page and upserts real fundamentals. Code:
[`apps/api/src/market/sync.ts`](../apps/api/src/market/sync.ts) and
[`deep-sync.ts`](../apps/api/src/market/deep-sync.ts).

---

## Source 1 — Market watch (`/market-watch`)

One `<table class="tbl">`, one `<tr>` per stock (~480 rows). The parse is robust
by design:

- **Columns are mapped by name, not position.** The header cells carry
  `data-name` attributes: `symbol, sector, listed, ldcp, open, high, low,
close, change, percentChange, volume`. We build a `name → column index` map
  from the header, so a column **re-order** can't silently corrupt values.
- **Numbers are read from `data-order`, not the visible text.** Each numeric
  `<td>` has a machine value, e.g. `<td data-order="334.25">334.25</td>` or
  `<td ... data-order="-2.326"><i class="icon-down-dir"></i> -2.33%</td>`. We
  read `data-order` so icons, commas and `%` never pollute the number.

A real OGDC row, trimmed:

```html
<td data-order="OGDC">
  <a class="tbl__symbol" href="/company/OGDC" data-title="Oil & Gas Development Company Limited"
    ><strong>OGDC</strong></a
  >
</td>
<td>0820</td>
<!-- sector code -->
<td>ALLSHR,KMI30,KMIALLSHR,KSE100,...</td>
<!-- index membership -->
<td class="right" data-order="334.25">334.25</td>
<!-- ldcp -->
... open / high / low ...
<td class="right" data-order="334.25">334.25</td>
<!-- close = CURRENT price -->
<td class="right" data-order="2.97">2.97</td>
<!-- change -->
<td class="right" data-order="0.897">0.90%</td>
<!-- percentChange -->
```

**What we extract per row** (`PsxConstituent`):

| Field                                | From                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `symbol`                             | text of the `symbol` cell                            |
| `companyName`                        | the `<a class="tbl__symbol">` `data-title` attribute |
| `sectorCode`                         | text of the `sector` cell (a number like `0820`)     |
| `price` / `change` / `changePercent` | `data-order` of `close` / `change` / `percentChange` |
| `isKmi30` / `isShariah`              | the `listed` cell tokens (see below)                 |

### Index membership (important nuance)

The `listed` column lists every index a stock belongs to. **PSX exposes
`KMI30` and `KMIALLSHR` (KMI All-Share) but NOT a literal `KMI100`.** Tokens
seen and their counts (at capture time): `KMI30`=30, `KMIALLSHR`=294.

Decisions encoded in [`sync/sync.ts`](../packages/market-data/src/sync/sync.ts):

- **Shariah** = present in `KMI30` or `KMIALLSHR` (KMI indices are Shariah-screened).
- **`isKmi30`** = `KMI30` token present (exactly 30 names).
- Our schema's two tiers map as: `KMI30` → the 30 blue chips; **`KMI100` tier →
  KMI All-Share** (the full ~294 Shariah universe). We don't have the real
  KMI-100 list from this feed; KMI All-Share is the right Shariah universe for
  this product.
- Non-Shariah names are **dropped** during sync.

### Sector names

Market-watch only gives a sector **code** (`0820`). We resolve names two ways:

1. **Seed bootstrap** ([`buildSectorMap`](../packages/market-data/src/sync/sync.ts)):
   for any synced symbol that's also in our curated seed
   ([`seed/companies.ts`](../packages/market-data/src/seed/companies.ts), which
   has correct sector names), we learn `code → name`. Covers ~the common ones.
2. **Deep sync** fills the rest with the real sector name from each company page.
   Until then, unknown codes show as `Sector <code>`.

### What market-watch does NOT give

Market cap, EPS, dividends, growth, beta. The quick sync fills
fundamentals/dividends with **price-anchored placeholders** (clearly estimates);
deep sync replaces the real ones.

---

## Source 2 — Company page (`/company/<SYMBOL>`)

Used by deep sync for real fundamentals. Key elements:

- **Sector name** — `<div class="quote__sector">OIL &amp; GAS EXPLORATION COMPANIES</div>`
  → normalized to `Oil & Gas Exploration` (strip `COMPANIES`, title-case).
- **Company name** — `<div class="quote__name">…</div>`.
- **Labelled stats** — pairs of
  `<div class="stats_label">…</div><div class="stats_value">…</div>`. We read:
  - `Market Cap (000's)` → ×1000 = PKR market cap
  - `Shares`
  - `P/E Ratio (TTM)`
- **Annual financials table** — a `<table>` whose header row is years
  (`2025 2024 2023 2022`) with rows incl. `Sales` and `EPS`. We take the latest
  `EPS`, and compute **revenue growth** = `Sales[latest] / Sales[prev] − 1`.
- **Ratios table** — years header with an `EPS Growth (%)` row → latest value /100.

Extracted into `PsxCompanyDetails` (all optional; missing fields keep the prior
estimate). Note: **banks have no `Sales` row** (interest income) so revenue
growth is skipped for them — expected, handled gracefully.

### Fields: real vs still estimated

| Field                                                                          | After deep sync                                                |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| sector name, market cap, P/E, **EPS, EPS growth, revenue growth**              | ✅ real                                                        |
| dividend yield, debt ratio, beta, ROE, book value, multi-year dividend history | ⚠️ still estimated (need financial statements / other sources) |

---

## Resilience & safety (already built in)

- Every fetch/parse returns `null` / `[]` on failure → the sync **aborts without
  touching existing data**. No partial corruption.
- Quick sync prunes non-Shariah names; deep sync **only upserts** (never prunes).
- **Fixture tests pin real captured values** so a DOM change fails CI loudly
  instead of shipping wrong numbers:
  - [`test/sync.test.ts`](../packages/market-data/test/sync.test.ts) — OGDC price 334.25, membership, sector
  - [`test/company.test.ts`](../packages/market-data/test/company.test.ts) — OGDC EPS 39.5, P/E 8.56, market cap, growth
  - Captured pages: `packages/market-data/src/scraping/__fixtures__/`

---

## 🔧 Runbook: "PSX changed their site and scraping broke"

Symptoms: sync returns 0 companies / wrong prices, or
`market-data` tests fail with mismatched values.

1. **Capture the current page** to compare against the fixture:
   ```bash
   curl -s -A "Mozilla/5.0" https://dps.psx.com.pk/market-watch -o /tmp/mw.html
   curl -s -A "Mozilla/5.0" https://dps.psx.com.pk/company/OGDC  -o /tmp/ogdc.html
   ```
2. **Inspect the structure** (does the table still use `class="tbl"`? do header
   `<th>` still have `data-name`? do numeric `<td>` still have `data-order`?):
   ```bash
   grep -oE '<th[^>]*data-name="[^"]*"' /tmp/mw.html | head -20
   grep -oE 'class="(quote__sector|quote__name|stats_label|stats_value)"' /tmp/ogdc.html | sort -u
   ```
3. **Fix the parser** to match the new markup:
   - Market watch → `packages/market-data/src/sync/constituents.ts` (column
     names, `data-order`, the `listed`/`symbol` cells).
   - Company page → `packages/market-data/src/scraping/company.ts` (the
     `quote__*` selectors, `stats_label/value`, the financials/ratios tables).
4. **Refresh the fixtures** with the newly captured pages:
   ```bash
   cp /tmp/mw.html   packages/market-data/src/scraping/__fixtures__/psx-market-watch.html
   cp /tmp/ogdc.html packages/market-data/src/scraping/__fixtures__/psx-company-ogdc.html
   ```
   (The market-watch fixture is a trimmed slice — keep a few full `<tr>` rows
   incl. the `<thead>`; OGDC is the full page.)
5. **Update the expected values** in the tests to the new real numbers
   (`EXPECTED` map in `sync.test`/`psx-parser` history, the `expect(...)` in
   `company.test`). Run:
   ```bash
   npx vitest run --project market-data
   ```
6. **Verify live** end-to-end:
   ```bash
   node --input-type=module -e '
     import { fetchPsxMarketWatchHtml, buildUniverseFromMarketWatch,
       fetchPsxCompanyHtml, parsePsxCompany } from "./packages/market-data/dist/index.js";
     const u = buildUniverseFromMarketWatch(await fetchPsxMarketWatchHtml(), new Date().toISOString());
     console.log("companies", u.companies.length, "kmi30",
       u.companies.filter(c=>c.indices.includes("KMI30")).length);
     console.log(parsePsxCompany(await fetchPsxCompanyHtml("LUCK")));'
   ```
   (build packages first: `npm run build:packages`.)

If PSX adds a real JSON/API endpoint, write a new `MarketDataProvider` and swap
it in — everything downstream is unchanged (see
[ARCHITECTURE.md](ARCHITECTURE.md)).

---

## Future improvements

- Real dividend yield / history (a `PAYOUTS` source), debt ratio, beta, ROE →
  fully real scoring inputs.
- Complete sector code→name map (or always run deep sync after quick sync).
- The literal KMI-100 constituent list (PSX/MUFAP publication) if exact KMI-100
  membership is needed vs. the broader KMI All-Share.
- Scheduled/automatic sync (e.g. a daily job) instead of manual button.
