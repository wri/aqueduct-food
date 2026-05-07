import { CROP_OPTIONS } from 'constants/crops';
import {
  VALID_CROP_VALUES,
  VALID_IRRIGATION_VALUES,
} from 'constants/supply-analyzer';

// ─── CSV template ─────────────────────────────────────────────────────────────

function generateTemplateCSV() {
  const rows = [
    ['type', 'latitude', 'longitude', 'radius_km', 'country_iso', 'state', 'crop', 'irrigation', 'volume'],
    ['latlong', '-1.2921', '36.8219', '50', '', '', 'wheat', 'irrigated', '1000'],
    ['country', '', '', '', 'KEN', 'Nairobi', '', 'rainfed', ''],
  ];
  return rows.map(r => r.join(',')).join('\n');
}

export function downloadTemplate() {
  const csv = generateTemplateCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'location-input-template.csv';
  a.click();
  URL.revokeObjectURL(url);
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
        volume: get('volume'),
      });
    } else if (type === 'country') {
      const country = get('country_iso');
      const irrigation = get('irrigation');

      if (!country || !VALID_IRRIGATION_VALUES.has(irrigation)) {
        const reasons = [];
        if (!country) reasons.push('country_iso');
        if (!VALID_IRRIGATION_VALUES.has(irrigation)) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'country',
        country,
        countryName: country,
        state: get('state'),
        irrigation,
        volume: get('volume'),
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
      entry.irrigation || null,
      entry.volume ? `Vol: ${entry.volume}` : null,
    ].filter(Boolean).join(' · ');
  }
  return [
    entry.countryName || entry.country,
    entry.state || null,
    entry.irrigation || null,
    entry.volume ? `Vol: ${entry.volume}` : null,
  ].filter(Boolean).join(' · ');
}

// ─── Validation ───────────────────────────────────────────────────────────────

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

    if (!entry.volume) {
      issues.push({
        field: 'volume',
        severity: 'warning',
        message: 'Volume is recommended for SBTN water-withdrawal analysis',
      });
    }
  }

  if (entry.type === 'country') {
    if (!entry.country) {
      issues.push({ field: 'country', severity: 'error', message: 'Country is required (SBTN)' });
    }
    if (!entry.irrigation) {
      issues.push({ field: 'irrigation', severity: 'error', message: 'Irrigation type is required (SBTN)' });
    }
    if (!entry.volume) {
      issues.push({
        field: 'volume',
        severity: 'warning',
        message: 'Volume is recommended for SBTN water-withdrawal analysis',
      });
    }
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
  return errors;
}

/**
 * @param {Object} form - countryForm shape
 * @returns {Object} field → error message map (empty = valid)
 */
export function validateCountryFields(form) {
  const errors = {};
  if (!form.country) errors.country = 'Required';
  if (!form.irrigation) errors.irrigation = 'Required';
  return errors;
}

export default {
  downloadTemplate,
  parseCSVText,
  summariseEntry,
  spatialHeuristicWarning,
  validateEntry,
  entryStatus,
  validateLatlongFields,
  validateCountryFields,
};
