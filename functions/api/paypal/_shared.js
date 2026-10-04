import { queueKey, readQueue, normalizeEventId } from "../print-queue.js";
import {
  buildPayPalPrintOrder,
  resolvePayPalEventPrintPrice,
  resolvePayPalPrintConfig,
  verifyPayPalCapture,
} from "../../../scripts/paypal-print-utils.mjs";

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function getPayPalConfig(env) {
  return resolvePayPalPrintConfig(env);
}

export async function getPayPalEventConfig(env, eventIdValue) {
  const config = getPayPalConfig(env || {});
  const eventId = normalizeEventId(eventIdValue);
  if (!env || !env.THEMES_KV || eventId === "default") return config;
  try {
    const raw = await env.THEMES_KV.get("events");
    const payload = raw ? JSON.parse(raw) : null;
    const events = Array.isArray(payload) ? payload : payload && Array.isArray(payload.events) ? payload.events : [];
    return {
      ...config,
      amount: resolvePayPalEventPrintPrice(events, eventId, config.amount),
    };
  } catch (error) {
    console.error("Could not load event print price", error && error.message);
  }
  return config;
}

export async function getPayPalAccessToken(config) {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    console.error("PayPal authentication failed", response.status, result.error || "provider_error");
    throw new Error("PayPal could not authenticate this checkout. Check the configured credentials and environment.");
  }
  return result.access_token;
}

export async function paypalRequest(config, accessToken, path, options = {}) {
  const response = await fetch(`${config.apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("PayPal API request failed", response.status, result.name || "provider_error");
    throw new Error("PayPal could not complete this checkout. Please try again or ask the attendant.");
  }
  return result;
}

export async function findPrintItem(env, eventIdValue, itemIdValue) {
  const eventId = normalizeEventId(eventIdValue);
  const itemId = String(itemIdValue || "").trim();
  if (!itemId) return { eventId, items: [], item: null, index: -1 };
  const items = await readQueue(env, eventId);
  const index = items.findIndex((item) => item && String(item.id) === itemId);
  return { eventId, items, item: index < 0 ? null : items[index], index };
}

export async function savePrintItem(env, eventId, items, index, item) {
  items[index] = item;
  await env.THEMES_KV.put(queueKey(eventId), JSON.stringify(items.slice(0, 500)));
}

export { buildPayPalPrintOrder, resolvePayPalEventPrintPrice, verifyPayPalCapture };
