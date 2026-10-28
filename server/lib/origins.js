/**
 * origins.js — the browser origins this API serves, used for CORS and for
 * checkout return links. CORS_ORIGINS wins; without it, local development
 * allows the Vite dev server and production allows nothing.
 */

'use strict';

const DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function allowedOrigins(env = process.env) {
  const configured = String(env.CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (configured.length) return new Set(configured);
  return new Set(env.NODE_ENV === 'production' ? [] : DEVELOPMENT_ORIGINS);
}

module.exports = { DEVELOPMENT_ORIGINS, allowedOrigins };
