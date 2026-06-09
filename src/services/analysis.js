import axios from 'axios';
import { sleep } from 'utils/general';
import { entryToApiLocation } from 'utils/supply-analyzer';
import RESULT_DATA from './TEMP_DATA.json'; // Comment out when not needed for dev due to bundle size

export const fetchAnalysis = (
  formData,
  indicator,
  threshold,
  {
    onDownloadProgress = () => {},
    onUploadProgress = () => {},
    onProcessing = () => {},
  }
) => (
  axios({
    method: 'post',
    url: `${config.ANALYSIS_API_URL}/aqueduct/analysis/food-supply-chain/${indicator}/${threshold}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    onDownloadProgress,
    onUploadProgress,
  })
    .then((response) => {
      const { status, statusText, data: { job_token: jobToken } = {} } = response || {};

      if (status >= 300) throw new Error(statusText);
      if (!jobToken) throw new Error('Request did not return a job token, please try again');

      return new Promise((resolve, reject) => {
        const makeRequest = () => (
          axios.get(`${config.ANALYSIS_API_URL}/aqueduct/analysis/food-supply-chain/${jobToken}`)
            .then(({ data = {} } = {}) => {
              const { results, percent_complete = 0, status: statusAnalisis } = data;
              onProcessing(percent_complete / 100);
              if (statusAnalisis === 'ready') {
                const s3Url = results.s3_url;
                if (s3Url) {
                  axios.get(s3Url)
                    .then(({ d }) => resolve(d))
                    .catch(reject);
                } else {
                  reject(new Error('Analyzer processing failed. Please try again'));
                }
                return;
              }
              if (statusAnalisis === 'failed') return reject(new Error('Analyzer processing failed. Please try again'));
              setTimeout(() => makeRequest(), 1000);
            })
        );
        makeRequest()
          .catch(reject);
      });
    })
    .catch((error) => { console.error(error.message); })
);

// Do a fake request
// export const fetchAnalysis = async (
export const fakeAnalysis = async (
  formData,
  indicator,
  threshold,
  {
    onDownloadProgress = () => {},
    onUploadProgress = () => {},
    onProcessing = () => {},
    includeErrors = true,
    includeLocations = true,
  }
) => {
  let progress = 0;

  // Upload
  while (progress < 1) {
    const added = Math.random() * 0.05 + 0.05;
    const ms = Math.random() * 100 + 200;
    progress += added;
    if (progress > 1) progress = 1;
    await sleep(ms);
    onUploadProgress({ loaded: progress, total: 1 });
  }

  onProcessing();
  await sleep(3000 + Math.random() * 2000);

  progress = 0;
  while (progress < 1) {
    const added = Math.random() * 0.05 + 0.05;
    const ms = Math.random() * 100 + 300;
    progress += added;
    if (progress > 1) progress = 1;
    await sleep(ms);
    onDownloadProgress({ loaded: progress, total: 1 });
  }

  const { locations, errors } = RESULT_DATA;
  // const { locations, errors } = { locations: [], errors: [] }

  return {
    locations: includeLocations ? locations : [],
    indicator,
    errors: includeErrors ? errors : [],
  };
};

export default { fetchAnalysis };

/**
 * Runs the food-supply-chain analysis against a list of validated InputPanel
 * entries. Each entry is converted to the API's location shape and POSTed in
 * a single batch — the server resolves point / state / country modes per row.
 *
 * @param {Object[]} entries - InputPanel entries
 * @param {Object} [options]
 * @param {'planar'|'geodesic'} [options.buffer] - buffer math for point inputs
 * @returns {Promise<{ results: Object[], errors: Object[], skipped: Object[] }>}
 */
export const runFoodSupplyChainAnalysis = (entries, { buffer } = {}) => {
  // Filter out entries that can't be mapped (e.g. unknown crop slug) so the
  // request itself is well-formed; surface them back to the caller as `skipped`.
  const skipped = [];
  const locations = [];
  entries.forEach((entry) => {
    const location = entryToApiLocation(entry);
    if (!location) {
      skipped.push({
        unique_id: String(entry.id),
        reason: 'Could not map entry to a commodity_code / irrigation the API understands',
      });
      return;
    }
    locations.push(location);
  });

  if (!locations.length) {
    return Promise.resolve({ results: [], errors: [], skipped });
  }

  const url = `${config.ANALYSIS_API_URL}/api/v1/aqueduct/analysis/food-supply-chain/locations`;
  return axios
    .post(url, { locations }, {
      headers: { 'Content-Type': 'application/json' },
      params: buffer ? { buffer } : undefined,
    })
    .then(({ data = {} }) => ({
      results: data.results || [],
      errors: data.errors || [],
      skipped,
    }));
};

/**
 * Checks which of the provided lat/lng entries fall outside land boundaries.
 *
 * @param {Object[]} entries - lat/lng InputPanel entries (must have .id, .latitude, .longitude)
 * @returns {Promise<Set<number|string>>} set of entry ids whose coordinates are outside land
 */
export const checkPointsOutsideLand = (entries) => {
  const locations = entries.map(e => ({
    lat: parseFloat(e.latitude),
    lng: parseFloat(e.longitude),
  }));

  return axios
    .post(
      `${config.ANALYSIS_API_URL}/api/v1/aqueduct/analysis/points-outside-land`,
      { locations },
      { headers: { 'Content-Type': 'application/json' } },
    )
    .then(({ data }) => {
      const outside = data.outside || [];
      const outsideIds = new Set();

      entries.forEach((entry) => {
        const lat = parseFloat(entry.latitude);
        const lng = parseFloat(entry.longitude);
        if (outside.some(o => o.lat === lat && o.lng === lng)) {
          outsideIds.add(entry.id);
        }
      });

      return outsideIds;
    });
};
