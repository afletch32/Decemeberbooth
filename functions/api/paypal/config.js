import { getPayPalConfig, jsonResponse } from "./_shared.js";

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  const config = getPayPalConfig(env || {});
  return jsonResponse({
    ok: true,
    configured: config.configured,
    environment: config.environment,
    amount: config.amount || "3.00",
    currency: config.currency || "USD",
    clientId: config.clientId || "",
  });
}
