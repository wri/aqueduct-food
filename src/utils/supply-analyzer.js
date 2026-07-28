import { CROP_OPTIONS } from 'constants/crops';
import {
  VALID_CROP_VALUES,
  VALID_IRRIGATION_VALUES,
  CROP_COMMODITY_NAMES,
  IRRIGATION_API_VALUES,
  DEFAULT_RADIUS_KM,
  DEFAULT_VOLUME,
  formatIrrigationLabel,
} from 'constants/supply-analyzer';

// ─── Business unit auto-population ────────────────────────────────────────────

/**
 * Computes the auto-generated business_unit for a single entry, given the
 * set of business_units already taken by other entries.
 *
 * Manual entries (lat/long and country) get sequential `point1`, `point2`, …
 * names — never the location itself (country/state), so Business Unit stays a
 * stable identifier distinct from geography. Uploaded templates that already
 * supply a Business Unit are left untouched by `fillMissingBusinessUnits`.
 */
export function defaultBusinessUnitFor(entry, taken) {
  if (!entry) return '';
  const takenSet = taken instanceof Set ? taken : new Set(taken);

  if (entry.type === 'latlong' || entry.type === 'country') {
    let max = 0;
    takenSet.forEach((bu) => {
      const match = /^point(\d+)$/.exec(bu);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    });
    return `point${max + 1}`;
  }

  return '';
}

/**
 * Returns the entry list with every entry's `businessUnit` populated:
 *   - existing non-empty values are preserved (CSV uploads, hand edits, etc.),
 *   - missing values are filled in using `defaultBusinessUnitFor`.
 *
 * Pass this through `addEntry`, `processUpload`, and the localStorage
 * hydration step so the table always has a stable identifier per row.
 */
export function fillMissingBusinessUnits(entries) {
  const taken = new Set();
  entries.forEach((e) => {
    if (e.businessUnit && String(e.businessUnit).trim()) {
      taken.add(String(e.businessUnit).trim());
    }
  });
  return entries.map((e) => {
    if (e.businessUnit && String(e.businessUnit).trim()) return e;
    const bu = defaultBusinessUnitFor(e, taken);
    if (bu) taken.add(bu);
    return { ...e, businessUnit: bu };
  });
}

// ─── Input template ─────────────────────────────────────────────────────────
// The downloadable, nicely formatted Excel workbook. Served as a static asset
// from `public/templates`. Filled copies are converted on upload (see
// `parseTemplateRows` below and the input-panel upload handler).

export const INPUT_TEMPLATE_FILENAME = 'AqueductFood_SupplyChain_Input_Template_20260728.xlsm';
// Relative so it works with production `publicPath: './'` (app is served from a
// subdirectory). Webpack copies `public/templates` into `dist/templates`.
export const INPUT_TEMPLATE_URL = `./templates/${INPUT_TEMPLATE_FILENAME}`;
export const INPUT_TEMPLATE_SHEET = 'data_entry';

export function downloadTemplate() {
  const a = document.createElement('a');
  a.href = INPUT_TEMPLATE_URL;
  a.download = INPUT_TEMPLATE_FILENAME;
  a.rel = 'noopener';
  a.click();
}

// ─── Excel template (data_entry sheet) parsing ────────────────────────────────
// Maps the pretty Excel template onto entry objects. The sheet's row 1 is a
// decorative "banner" (merged group headers), so it is dropped and row 2 is
// treated as the real header row. A `type` column is derived per row:
// `latlong` when latitude + longitude are present, otherwise `country`.

// Possible header texts (row 2) for each field, matched case-insensitively and
// ignoring punctuation/whitespace. Adjust here if the template headers change.
const TEMPLATE_HEADER_ALIASES = {
  businessUnit: ['business unit', 'business details'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'long', 'lon', 'lng'],
  radius: ['radius km', 'radius', 'radius m'],
  countryIso: ['iso code', 'country iso', 'country code'],
  countryName: ['country'],
  state: ['state', 'province', 'state province'],
  crop: ['commodity', 'crop', 'crop type', 'material type'],
  cropCode: ['commodity code'],
  volume: ['total volume mt', 'total volume', 'volume mt', 'volume', 'quantity'],
  irrigation: ['irrigation', 'irrigation type'],
};

// Template commodity labels/codes → the tool's crop values.
const CROP_LABEL_TO_VALUE = CROP_OPTIONS.reduce((acc, option) => {
  acc[option.label.toLowerCase()] = option.value;
  acc[option.value.toLowerCase()] = option.value;
  return acc;
}, {});

const normalizeTemplateHeader = value => String(value == null ? '' : value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function resolveTemplateHeaders(headerRow = []) {
  const normalized = headerRow.map(normalizeTemplateHeader);
  const resolved = {};
  Object.keys(TEMPLATE_HEADER_ALIASES).forEach((key) => {
    const aliases = TEMPLATE_HEADER_ALIASES[key];
    const idx = normalized.findIndex(header => header && aliases.includes(header));
    if (idx !== -1) resolved[key] = idx;
  });
  return resolved;
}

const templateCell = (row, idx) => (idx == null || row[idx] == null ? '' : String(row[idx]).trim());

// Template irrigation labels (Rainfed / Irrigated / Both / Unknown / All) →
// tool values. Both / Unknown / All collapse to `all` (shown as All/Unknown).
function normalizeTemplateIrrigation(value) {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'rainfed') return 'rainfed';
  if (v === 'irrigated') return 'irrigated';
  return 'all';
}

function normalizeTemplateCrop(label, code) {
  const byLabel = CROP_LABEL_TO_VALUE[String(label || '').toLowerCase().trim()];
  if (byLabel) return byLabel;
  const byCode = CROP_LABEL_TO_VALUE[String(code || '').toLowerCase().trim()];
  if (byCode) return byCode;
  return String(label || code || '').toLowerCase().trim();
}

/**
 * Converts the `data_entry` sheet (an array-of-arrays that still includes the
 * row-1 banner) into validated entry objects, mirroring `parseCSVText`.
 *
 * @param {Array<Array>} rows - sheet rows (e.g. XLSX.utils.sheet_to_json(sheet, { header: 1 }))
 * @returns {{ parsed: Object[], skipped: { row: number, reasons: string[] }[] }}
 */
export function parseTemplateRows(rows) {
  if (!rows || rows.length < 3) return { parsed: [], skipped: [] };

  const [, headerRow, ...dataRows] = rows; // drop the banner row
  const cols = resolveTemplateHeaders(headerRow);
  const parsed = [];
  const skipped = [];
  const base = Date.now();

  dataRows.forEach((row, i) => {
    if (!row || row.every(cell => String(cell == null ? '' : cell).trim() === '')) return;
    const rowNum = i + 3; // banner + header + 1-based data offset

    const crop = normalizeTemplateCrop(templateCell(row, cols.crop), templateCell(row, cols.cropCode));
    const irrigation = normalizeTemplateIrrigation(templateCell(row, cols.irrigation));
    const businessUnit = templateCell(row, cols.businessUnit);
    const volume = templateCell(row, cols.volume) || String(DEFAULT_VOLUME);
    const latitude = templateCell(row, cols.latitude);
    const longitude = templateCell(row, cols.longitude);
    const cropOk = VALID_CROP_VALUES.has(crop);
    const irrigOk = VALID_IRRIGATION_VALUES.has(irrigation);

    if (latitude !== '' && longitude !== '') {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const latOk = !Number.isNaN(lat) && lat >= -90 && lat <= 90;
      const lngOk = !Number.isNaN(lng) && lng >= -180 && lng <= 180;

      if (!latOk || !lngOk || !cropOk || !irrigOk) {
        const reasons = [];
        if (!latOk) reasons.push('latitude');
        if (!lngOk) reasons.push('longitude');
        if (!cropOk) reasons.push('crop');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'latlong',
        latitude: String(lat),
        longitude: String(lng),
        radius: templateCell(row, cols.radius),
        crop,
        irrigation,
        volume,
        ...(businessUnit && { businessUnit }),
      });
    } else {
      const country = templateCell(row, cols.countryIso) || templateCell(row, cols.countryName);

      if (!country || !cropOk || !irrigOk) {
        const reasons = [];
        if (!country) reasons.push('country');
        if (!cropOk) reasons.push('crop');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'country',
        country,
        countryName: templateCell(row, cols.countryName) || country,
        state: templateCell(row, cols.state),
        crop,
        irrigation,
        volume,
        ...(businessUnit && { businessUnit }),
      });
    }
  });

  return { parsed, skipped };
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

/**
 * Parses the text content of a CSV file into validated entry objects.
 *
 * @param {string} text - raw CSV string
 * @returns {{ parsed: Object[], skipped: { row: number, reasons: string[] }[] }}
 */
export function parseCSVText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { parsed: [], skipped: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = col => headers.indexOf(col);
  const parsed = [];
  const skipped = [];
  const base = Date.now();

  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    const get = col => (idx(col) >= 0 ? cols[idx(col)] || '' : '');
    const rowNum = i + 2;
    const type = get('type').toLowerCase();

    if (type === 'latlong') {
      const lat = parseFloat(get('latitude'));
      const lng = parseFloat(get('longitude'));
      const crop = get('crop');
      const irrigation = get('irrigation');

      const latOk = !Number.isNaN(lat) && lat >= -90 && lat <= 90;
      const lngOk = !Number.isNaN(lng) && lng >= -180 && lng <= 180;
      const cropOk = VALID_CROP_VALUES.has(crop);
      const irrigOk = VALID_IRRIGATION_VALUES.has(irrigation);

      if (!latOk || !lngOk || !cropOk || !irrigOk) {
        const reasons = [];
        if (!latOk) reasons.push('latitude');
        if (!lngOk) reasons.push('longitude');
        if (!cropOk) reasons.push('crop');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'latlong',
        latitude: String(lat),
        longitude: String(lng),
        radius: get('radius_km'),
        crop,
        irrigation,
        volume: get('volume') || String(DEFAULT_VOLUME),
        ...(get('business_unit') && { businessUnit: get('business_unit') }),
      });
    } else if (type === 'country') {
      const country = get('country_iso');
      const crop = get('crop');
      const irrigation = get('irrigation');

      const cropOk = VALID_CROP_VALUES.has(crop);
      const irrigOk = VALID_IRRIGATION_VALUES.has(irrigation);

      if (!country || !cropOk || !irrigOk) {
        const reasons = [];
        if (!country) reasons.push('country_iso');
        if (!cropOk) reasons.push('crop');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'country',
        country,
        countryName: country,
        state: get('state'),
        crop,
        irrigation,
        volume: get('volume') || String(DEFAULT_VOLUME),
        ...(get('business_unit') && { businessUnit: get('business_unit') }),
      });
    } else {
      skipped.push({ row: rowNum, reasons: ['unknown type'] });
    }
  });

  return { parsed, skipped };
}

// ─── Entry display ────────────────────────────────────────────────────────────

/**
 * Builds a compact human-readable summary string for a single entry.
 *
 * @param {Object} entry - InputPanel entry object
 * @returns {string}
 */
export function summariseEntry(entry) {
  if (entry.type === 'latlong') {
    const lat = parseFloat(entry.latitude).toFixed(4);
    const lng = parseFloat(entry.longitude).toFixed(4);
    const cropLabel = CROP_OPTIONS.find(c => c.value === entry.crop)?.label || entry.crop;
    return [
      `${lat}, ${lng}`,
      entry.radius ? `${entry.radius} km` : null,
      cropLabel || '—',
      formatIrrigationLabel(entry.irrigation) || null,
      entry.volume ? `Vol (MT): ${entry.volume}` : null,
    ].filter(Boolean).join(' · ');
  }
  const cropLabel = CROP_OPTIONS.find(c => c.value === entry.crop)?.label || entry.crop;
  return [
    entry.countryName || entry.country,
    entry.state || null,
    cropLabel || null,
    formatIrrigationLabel(entry.irrigation) || null,
    entry.volume ? `Vol (MT): ${entry.volume}` : null,
  ].filter(Boolean).join(' · ');
}

// ─── Validation ───────────────────────────────────────────────────────────────

function getVolumeValidationIssue(volume) {
  if (volume === '' || volume === null || volume === undefined) {
    return {
      field: 'volume',
      severity: 'error',
      message: 'Volume (MT) is required',
    };
  }
  const parsed = parseFloat(volume);
  if (Number.isNaN(parsed)) {
    return {
      field: 'volume',
      severity: 'error',
      message: 'Volume (MT) must be a number',
    };
  }
  if (parsed <= 0) {
    return {
      field: 'volume',
      severity: 'error',
      message: 'Volume (MT) must be greater than 0',
    };
  }
  return null;
}

function getVolumeFieldError(volume) {
  const issue = getVolumeValidationIssue(volume);
  if (!issue) return null;
  if (issue.message === 'Volume (MT) is required') return 'Required';
  if (issue.message === 'Volume (MT) must be greater than 0') return 'Must be greater than 0';
  return 'Must be a number';
}

/** Space-optimised iterative Levenshtein distance. */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * Returns the closest valid crop option for a raw string,
 * or null if nothing is within 3 edits.
 */
function findClosestCrop(raw) {
  const input = raw.toLowerCase().trim();
  let best = null;
  let bestDist = Infinity;
  CROP_OPTIONS.forEach(({ value, label }) => {
    const d = Math.min(
      levenshtein(input, value.toLowerCase()),
      levenshtein(input, label.toLowerCase()),
    );
    if (d < bestDist && d <= 3) {
      bestDist = d;
      best = { value, label };
    }
  });
  return best;
}

/**
 * Heuristic spatial checks (applied after basic range validation passes).
 * Returns a warning message string or null.
 */
export function spatialHeuristicWarning(lat, lng) {
  if (lat === 0 && lng === 0) {
    return '(0°, 0°) is in the Gulf of Guinea (ocean) — likely a data-entry error';
  }
  if (lat < -56) {
    return 'South of 56°S — likely open ocean or Antarctica';
  }
  if (Math.abs(lat) > 84) {
    return 'Polar region (>84° latitude) — unlikely to be an agricultural location';
  }
  return null;
}

/**
 * Full SBTN entry validation.
 * Returns an array of Issue objects:
 *   { field, severity: 'error'|'warning', message, fix?, suggestion? }
 *
 * fix values: 'swap' (invert lat/lng), 'crop' (apply suggestion.value)
 */
export function validateEntry(entry) {
  const issues = [];

  if (entry.type === 'latlong') {
    const lat = parseFloat(entry.latitude);
    const lng = parseFloat(entry.longitude);
    const latInvalid = Number.isNaN(lat) || lat < -90 || lat > 90;
    const lngInvalid = Number.isNaN(lng) || lng < -180 || lng > 180;

    if (latInvalid || lngInvalid) {
      const swapWouldFix = !Number.isNaN(lat) && !Number.isNaN(lng)
        && lng >= -90 && lng <= 90
        && lat >= -180 && lat <= 180;

      if (swapWouldFix) {
        issues.push({
          field: 'coordinates',
          severity: 'error',
          message: 'Lat / Long appear to be inverted',
          fix: 'swap',
        });
      } else {
        if (latInvalid) {
          issues.push({
            field: 'latitude',
            severity: 'error',
            message: Number.isNaN(lat)
              ? 'Latitude is required'
              : 'Latitude must be between −90 and 90',
          });
        }
        if (lngInvalid) {
          issues.push({
            field: 'longitude',
            severity: 'error',
            message: Number.isNaN(lng)
              ? 'Longitude is required'
              : 'Longitude must be between −180 and 180',
          });
        }
      }
    } else {
      const spatialMsg = spatialHeuristicWarning(lat, lng);
      if (spatialMsg) {
        issues.push({ field: 'coordinates', severity: 'warning', message: spatialMsg });
      }
    }

    if (!entry.crop) {
      issues.push({ field: 'crop', severity: 'error', message: 'Crop is required (SBTN)' });
    } else if (!VALID_CROP_VALUES.has(entry.crop)) {
      const suggestion = findClosestCrop(entry.crop);
      issues.push({
        field: 'crop',
        severity: 'error',
        message: `Unknown crop "${entry.crop}"${suggestion ? ` — did you mean "${suggestion.label}"?` : ''}`,
        ...(suggestion && { fix: 'crop', suggestion }),
      });
    }

    if (!entry.irrigation) {
      issues.push({ field: 'irrigation', severity: 'error', message: 'Irrigation type is required (SBTN)' });
    }

    const volumeIssue = getVolumeValidationIssue(entry.volume);
    if (volumeIssue) issues.push(volumeIssue);
  }

  if (entry.type === 'country') {
    if (!entry.country) {
      issues.push({ field: 'country', severity: 'error', message: 'Country is required (SBTN)' });
    }
    if (!entry.crop) {
      issues.push({ field: 'crop', severity: 'error', message: 'Crop is required (SBTN)' });
    } else if (!VALID_CROP_VALUES.has(entry.crop)) {
      const suggestion = findClosestCrop(entry.crop);
      issues.push({
        field: 'crop',
        severity: 'error',
        message: `Unknown crop "${entry.crop}"${suggestion ? ` — did you mean "${suggestion.label}"?` : ''}`,
        ...(suggestion && { fix: 'crop', suggestion }),
      });
    }
    if (!entry.irrigation) {
      issues.push({ field: 'irrigation', severity: 'error', message: 'Irrigation type is required (SBTN)' });
    }

    const countryVolumeIssue = getVolumeValidationIssue(entry.volume);
    if (countryVolumeIssue) issues.push(countryVolumeIssue);
  }

  return issues;
}

/** Returns 'error' | 'warning' | 'valid' for an issues array. */
export function entryStatus(issues) {
  if (issues.some(i => i.severity === 'error')) return 'error';
  if (issues.some(i => i.severity === 'warning')) return 'warning';
  return 'valid';
}

// ─── Form-level validators (gate the add / save actions) ─────────────────────

/**
 * @param {Object} form - latlongForm shape
 * @returns {Object} field → error message map (empty = valid)
 */
export function validateLatlongFields(form) {
  const errors = {};
  const lat = parseFloat(form.latitude);
  const lng = parseFloat(form.longitude);

  if (form.latitude === '' || Number.isNaN(lat)) errors.latitude = 'Required';
  else if (lat < -90 || lat > 90) errors.latitude = 'Must be between −90 and 90';

  if (form.longitude === '' || Number.isNaN(lng)) errors.longitude = 'Required';
  else if (lng < -180 || lng > 180) errors.longitude = 'Must be between −180 and 180';

  if (!form.crop) errors.crop = 'Required';
  if (!form.irrigation) errors.irrigation = 'Required';
  const volumeError = getVolumeFieldError(form.volume);
  if (volumeError) errors.volume = volumeError;
  return errors;
}

/**
 * @param {Object} form - countryForm shape
 * @returns {Object} field → error message map (empty = valid)
 */
export function validateCountryFields(form) {
  const errors = {};
  if (!form.country) errors.country = 'Required';
  if (!form.crop) errors.crop = 'Required';
  if (!form.irrigation) errors.irrigation = 'Required';
  const volumeError = getVolumeFieldError(form.volume);
  if (volumeError) errors.volume = volumeError;
  return errors;
}

/**
 * Detects duplicate entries across a list of InputPanel entries.
 *
 * Two lat/long entries are considered duplicates only when the entire input
 * tuple matches: lat, lng, radius, crop, and irrigation. Differing radius,
 * crop, or irrigation produces a different analysis result, so those entries
 * are intentionally allowed even when they share coordinates.
 *
 * For each set of entries that produce identical analysis inputs:
 *   - The first occurrence receives a `warning` issue.
 *   - Every subsequent occurrence receives an `error` issue.
 *
 * Entries that are not lat/lng type, or whose coordinates are not yet valid
 * numbers, are ignored.
 *
 * @param {Object[]} entries - InputPanel entry objects
 * @returns {Map<id, Issue>} map from entry id to its duplicate issue (only
 *   entries involved in a duplicate are present in the map)
 */
export function findDuplicateCoordIssues(entries) {
  const groups = new Map(); // composite key → [id, ...]

  entries.forEach((entry) => {
    if (entry.type !== 'latlong') return;
    const lat = parseFloat(entry.latitude);
    const lng = parseFloat(entry.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    // Normalise radius the same way the API call does so "blank" and the
    // default radius collapse together but distinct radii stay distinct.
    const rawRadius = parseFloat(entry.radius);
    const radius = !Number.isNaN(rawRadius) && rawRadius > 0
      ? rawRadius
      : 'default';

    const crop = entry.crop || '';
    const irrigation = entry.irrigation || '';

    const key = `${lat}|${lng}|${radius}|${crop}|${irrigation}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry.id);
  });

  const result = new Map(); // id → Issue

  groups.forEach((ids) => {
    if (ids.length < 2) return;
    const others = ids.length - 1;
    ids.forEach((id, index) => {
      result.set(id, {
        field: 'coordinates',
        severity: index === 0 ? 'warning' : 'error',
        message: index === 0
          ? `Duplicate entry — ${others} other ${others === 1 ? 'entry shares' : 'entries share'} the same coordinates, radius, crop, and irrigation`
          : 'Duplicate entry — same coordinates, radius, crop, and irrigation already entered above',
      });
    });
  });

  return result;
}

/**
 * Collects all validation issues for a single entry: field-level validation,
 * the land-boundary check (outsideLandIds), and duplicate-coordinate issues.
 *
 * @param {Object} entry - InputPanel entry
 * @param {Array<number|string>} outsideLandIds - ids flagged outside land
 * @param {Map} duplicateIssues - output of findDuplicateCoordIssues
 * @returns {Object[]} issues
 */
export function getEntryIssues(entry, outsideLandIds = [], duplicateIssues = new Map()) {
  const issues = validateEntry(entry);

  if (entry.type === 'latlong' && outsideLandIds.includes(entry.id)) {
    issues.push({
      field: 'coordinates',
      severity: 'error',
      message: 'Coordinates are outside land boundaries',
    });
  }

  const dupIssue = duplicateIssues.get(entry.id);
  if (dupIssue) issues.push(dupIssue);

  return issues;
}

/**
 * Classifies a list of entries into error / warning / valid buckets, factoring
 * in the land-boundary check. Shared by the review summary/actions (header) and
 * the locations list (card) so both stay in sync.
 *
 * @param {Object[]} entries
 * @param {Array<number|string>} outsideLandIds
 * @returns {{ validated, errors, warnings, valid, validCount }}
 */
export function classifyEntries(entries = [], outsideLandIds = []) {
  const duplicateIssues = findDuplicateCoordIssues(entries);
  const validated = entries.map(entry => ({
    entry,
    issues: getEntryIssues(entry, outsideLandIds, duplicateIssues),
  }));
  const errors = validated.filter(({ issues }) => entryStatus(issues) === 'error');
  const warnings = validated.filter(({ issues }) => entryStatus(issues) === 'warning');
  const valid = validated.filter(({ issues }) => entryStatus(issues) === 'valid');

  return {
    validated,
    errors,
    warnings,
    valid,
    validCount: validated.length - errors.length,
  };
}

// ─── Analysis API mapping ─────────────────────────────────────────────────────

/**
 * Converts a single InputPanel entry into the request shape expected by the
 * food-supply-chain analysis endpoint.
 *
 * - lat/long entries → point mode (lat, lng, radius, radius_units)
 * - country entries with a state → state mode (country, state)
 * - country entries without a state → country mode (iso_code)
 *
 * Returns `null` if the entry can't be mapped (e.g. missing crop name).
 *
 * @param {Object} entry - InputPanel entry object
 * @returns {Object|null} location payload for POST .../locations
 */
export function entryToApiLocation(entry) {
  const commodity = CROP_COMMODITY_NAMES[entry.crop];
  const irrigation = IRRIGATION_API_VALUES[entry.irrigation];
  if (!commodity || !irrigation) return null;

  const volume = parseFloat(entry.volume);
  const volumeFields = !Number.isNaN(volume) && volume > 0
    ? { total_volume: volume, volume_units: 'MT' }
    : {};

  if (entry.type === 'latlong') {
    const radius = parseFloat(entry.radius);
    const radiusKm = !Number.isNaN(radius) && radius > 0 ? radius : DEFAULT_RADIUS_KM;
    return {
      unique_id: String(entry.id),
      lat: parseFloat(entry.latitude),
      lng: parseFloat(entry.longitude),
      radius: radiusKm,
      radius_units: 'km',
      commodity,
      irrigation,
      ...volumeFields,
    };
  }

  if (entry.type === 'country') {
    const base = {
      unique_id: String(entry.id),
      commodity,
      irrigation,
      ...volumeFields,
    };
    // ISO code if present, otherwise free-text country name
    if (entry.country) base.iso_code = entry.country;
    if (entry.countryName) base.country = entry.countryName;
    if (entry.state && entry.state.trim()) base.state = entry.state.trim();
    return base;
  }

  return null;
}

export default {
  downloadTemplate,
  parseCSVText,
  parseTemplateRows,
  summariseEntry,
  spatialHeuristicWarning,
  validateEntry,
  entryStatus,
  validateLatlongFields,
  validateCountryFields,
  findDuplicateCoordIssues,
  entryToApiLocation,
};
