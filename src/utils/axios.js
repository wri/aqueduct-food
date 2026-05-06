import axios from 'axios';

/**
 * Shared axios instance pointing at the WRI Resource Watch API.
 * `config.API_URL` is injected by webpack DefinePlugin from the
 * environment variable API_URL (e.g. https://api.resourcewatch.org).
 */
export const WRIAPI = axios.create({
  // eslint-disable-next-line no-undef
  baseURL: config.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default { WRIAPI };
