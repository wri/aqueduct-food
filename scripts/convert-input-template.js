#!/usr/bin/env node
/**
 * Converts the "pretty" supply-chain input template
 * (AqueductFood_SupplyChain_Input_Template_20260728.xlsm) into the flat
 * CSV that the in-tool bulk uploader understands (see `parseCSVText` in
 * `src/utils/supply-analyzer.js`).
 *
 * NOTE: the tool can now also read the .xlsm directly on upload (it applies the
 * same transformation as this script via `parseTemplateRows`). This standalone
 * script is handy for offline / bulk conversion.
 *
 * What it does, per the reviewers' notes:
 *   1. Reads the `data_entry` sheet (configurable via --sheet).
 *   2. Drops row 1 (the merged banner / group-header row) so that row 2 is
 *      treated as the real column headers.
 *   3. Adds a `type` column, derived per row: `latlong` when latitude +
 *      longitude are present, otherwise `country`.
 *   4. Maps the template's columns onto the exact headers the tool parses:
 *      type, business_unit, latitude, longitude, radius_km, country_iso,
 *      state, crop, irrigation, volume.
 *
 * The template's `data_entry` header row (row 2) is:
 *   Business Unit | Latitude | Longitude | Radius (km) | Country | iso_code |
 *   State | Commodity | commodity_code | Total Volume (MT) | Irrigation
 *
 * Usage:
 *   npm install xlsx            # one-time (SheetJS)
 *   node scripts/convert-input-template.js <input.xlsm> [output.csv] [--sheet data_entry]
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

let XLSX;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  XLSX = require('xlsx');
} catch (e) {
  console.error('Missing dependency "xlsx". Install it first:\n  npm install xlsx');
  process.exit(1);
}

// Output columns, in the order the uploader is happy to read.
const OUTPUT_HEADERS = [
  'type',
  'business_unit',
  'latitude',
  'longitude',
  'radius_km',
  'country_iso',
  'state',
  'crop',
  'irrigation',
  'volume',
];

// Possible source header texts per field (matched case-insensitively, ignoring
// punctuation/whitespace). Order matters for country: iso_code is preferred.
const HEADER_ALIASES = {
  business_unit: ['business unit', 'business details'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'long', 'lon', 'lng'],
  radius_km: ['radius km', 'radius'],
  country_iso: ['iso code', 'country iso', 'country code'],
  country_name: ['country'],
  state: ['state', 'province', 'state province'],
  crop: ['commodity', 'crop', 'crop type', 'material type'],
  crop_code: ['commodity code'],
  volume: ['total volume mt', 'total volume', 'volume mt', 'volume', 'quantity'],
  irrigation: ['irrigation', 'irrigation type'],
};

// Template commodity labels/codes → tool crop values (from CROP_OPTIONS).
const CROP_LABEL_TO_VALUE = {
  'all crops': 'all',
  'arabica coffee': 'arabic coffee',
  'arabic coffee': 'arabic coffee',
  banana: 'banana',
  barley: 'barley',
  bean: 'bean',
  cassava: 'cassava',
  chickpea: 'chickpea',
  citrus: 'citrus',
  cocoa: 'cocoa',
  coconut: 'coconut',
  cotton: 'cotton',
  cowpea: 'cowpea',
  groundnut: 'groundnut',
  lentil: 'lentil',
  maize: 'maize',
  oilpalm: 'oilpalm',
  onion: 'onion',
  'other cereals': 'other cereals',
  'other fibres': 'other fibre crops',
  'other fibre crop': 'other fibre crops',
  'other oil crops': 'other oil crops',
  'other pulses': 'other pulses',
  'other roots': 'other roots',
  'other tropical fruit': 'other tropical fruit',
  'tropical fruit': 'other tropical fruit',
  'other vegetables': 'other vegetables',
  vegetables: 'other vegetables',
  'pearl millet': 'pearl millet',
  'pigeon pea': 'pigeon pea',
  pigeonpea: 'pigeon pea',
  plantain: 'plantain',
  potato: 'potato',
  rapeseed: 'rapeseed',
  'rest of crops': 'rest of crops',
  rice: 'rice',
  'robusta coffee': 'robusta coffee',
  rubber: 'rubber',
  'sesame seed': 'sesame seed',
  sesameseed: 'sesame seed',
  'small millet': 'small millet',
  sorghum: 'sorghum',
  soybean: 'soybean',
  sugarbeet: 'sugarbeet',
  sugarcane: 'sugarcane',
  sunflower: 'sunflower',
  'sweet potato': 'sweet potato',
  tea: 'tea',
  'temperate fruit': 'temperate fruit',
  tobacco: 'tobacco',
  tomato: 'tomato',
  wheat: 'wheat',
  yams: 'yams',
};

const normalize = s => String(s == null ? '' : s)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function mapHeaders(headerRow) {
  const normalized = headerRow.map(normalize);
  const resolved = {};
  Object.keys(HEADER_ALIASES).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    const idx = normalized.findIndex(h => h && aliases.includes(h));
    if (idx !== -1) resolved[key] = idx;
  });
  return resolved;
}

const cell = (row, idx) => (idx == null || row[idx] == null ? '' : String(row[idx]).trim());

function normalizeIrrigation(value) {
  const v = normalize(value);
  if (v === 'rainfed') return 'rainfed';
  if (v === 'irrigated') return 'irrigated';
  return 'all'; // Both / Unknown / All / blank → All/Unknown in the UI
}

function normalizeCrop(label, code) {
  return CROP_LABEL_TO_VALUE[normalize(label)]
    || CROP_LABEL_TO_VALUE[normalize(code)]
    || normalize(label)
    || normalize(code);
}

function csvField(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const args = process.argv.slice(2);
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--sheet') { flags.sheet = args[i + 1]; i += 1; } else positional.push(args[i]);
  }

  const input = positional[0];
  if (!input) {
    console.error('Usage: node scripts/convert-input-template.js <input.xlsm> [output.csv] [--sheet data_entry]');
    process.exit(1);
  }
  const sheetName = flags.sheet || 'data_entry';
  const output = positional[1] || path.join(path.dirname(input), 'location-input-template.csv');

  const wb = XLSX.readFile(input);
  const resolvedSheet = wb.Sheets[sheetName]
    || wb.Sheets[wb.SheetNames.find(n => normalize(n) === normalize(sheetName))];
  if (!resolvedSheet) {
    console.error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(resolvedSheet, { header: 1, blankrows: false, defval: '' });
  if (rows.length < 3) {
    console.error('Sheet has too few rows after dropping the banner row.');
    process.exit(1);
  }

  const [, headerRow, ...dataRows] = rows; // drop banner (row 1)
  const cols = mapHeaders(headerRow);

  const outLines = [OUTPUT_HEADERS.join(',')];
  let written = 0;

  dataRows.forEach((row) => {
    if (!row || row.every(c => String(c).trim() === '')) return;

    const latitude = cell(row, cols.latitude);
    const longitude = cell(row, cols.longitude);
    const hasLatLng = latitude !== '' && longitude !== '';
    const countryIso = cell(row, cols.country_iso) || cell(row, cols.country_name);
    if (!hasLatLng && countryIso === '') return;

    const record = {
      type: hasLatLng ? 'latlong' : 'country',
      business_unit: cell(row, cols.business_unit),
      latitude,
      longitude,
      radius_km: cell(row, cols.radius_km),
      country_iso: hasLatLng ? '' : countryIso,
      state: cell(row, cols.state),
      crop: normalizeCrop(cell(row, cols.crop), cell(row, cols.crop_code)),
      irrigation: normalizeIrrigation(cell(row, cols.irrigation)),
      volume: cell(row, cols.volume),
    };

    outLines.push(OUTPUT_HEADERS.map(h => csvField(record[h])).join(','));
    written += 1;
  });

  fs.writeFileSync(output, `${outLines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${written} rows → ${output}`);

  const unmatched = ['latitude', 'longitude', 'crop', 'irrigation', 'volume']
    .filter(h => cols[h] == null);
  if (unmatched.length) {
    console.warn(`Note: no source header matched: ${unmatched.join(', ')}. Update HEADER_ALIASES if needed.`);
  }
}

main();
