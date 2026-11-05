/**
 * Where tests find a built copy of the site: the deployed one when PLAYWRIGHT_BASE_URL is set, otherwise the
 * `vite preview` server that playwright.config.ts starts one port above the dev server.
 */
const devPort = Number(process.env.PLAYWRIGHT_PORT) || 5173;
export const builtSitePort = devPort + 1;
export const builtSiteUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${builtSitePort}/gylio/`;
