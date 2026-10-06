// ==========================================
// 💾 مدیریت تنظیمات و لاگ‌ها در Cloudflare KV
// ==========================================

import { getDefaultSettings } from '../config/defaults.js';

export async function getSettings(env) {
  try {
    if (env.BOT_CONFIG) {
      const stored = await env.BOT_CONFIG.get("settings", "json");
      if (stored && stored.symbols) return stored;
    }
  } catch (e) {
    console.error("KV READ ERROR:", e.message);
  }
  return getDefaultSettings(env);
}

export async function saveSettings(env, settings) {
  if (!env.BOT_CONFIG) throw new Error("KV Namespace (BOT_CONFIG) متصل نشده است.");
  await env.BOT_CONFIG.put("settings", JSON.stringify(settings));
}

export async function getSentLog(env) {
  if (!env.BOT_CONFIG) return [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  try {
    const log = await env.BOT_CONFIG.get(key, "json");
    return log || [];
  } catch (e) {
    return [];
  }
}

export async function addSentLog(env, timeStr) {
  if (!env.BOT_CONFIG) return;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  const log = await getSentLog(env);
  if (!log.includes(timeStr)) {
    log.push(timeStr);
    await env.BOT_CONFIG.put(key, JSON.stringify(log), { expirationTtl: 172800 });
  }
}
