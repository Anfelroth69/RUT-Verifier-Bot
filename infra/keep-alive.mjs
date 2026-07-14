#!/usr/bin/env node
// Health check keep-alive for rut-verifier-api-tlsc
// Prevents Render free/starter tier from spinning down the API after 15 min idle.
// Render cron job runs this every 10 minutes.

const URL = process.env.KEEP_ALIVE_TARGET || 'https://rut-verifier-api-tlsc.onrender.com/api/v1/health';
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000;
const REQUEST_TIMEOUT_MS = 10000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ping(attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(URL, { signal: controller.signal });
    const elapsed = Date.now() - start;
    clearTimeout(timer);
    const ts = new Date().toISOString();
    if (res.ok) {
      console.log(`[${ts}] ping #${attempt} OK ${res.status} ${elapsed}ms`);
      return true;
    }
    console.error(`[${ts}] ping #${attempt} FAIL HTTP ${res.status} ${elapsed}ms`);
    return false;
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    const ts = new Date().toISOString();
    console.error(`[${ts}] ping #${attempt} ERROR ${err.name} ${elapsed}ms: ${err.message}`);
    return false;
  }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ok = await ping(attempt);
    if (ok) process.exit(0);
    if (attempt < MAX_RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
  }
  console.error(`All ${MAX_RETRIES} attempts failed for ${URL}`);
  process.exit(1);
}

main();
