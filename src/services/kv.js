// ==========================================
// 💾 مدیریت تنظیمات در Cloudflare KV
// ==========================================

import { getDefaultSettings } from '../config/defaults.js';

// خواندن تنظیمات از KV (با fallback به پیش‌فرض)
export async function getSettings(env) {
  try {
    const stored = await env.BOT_CONFIG.get("settings", "json");
    if (stored && stored.symbols) return stored;
  } catch (e) {
    console.error("KV READ ERROR:", e.message);
  }
  return getDefaultSettings(env);
}

// ذخیره تنظیمات در KV
export async function saveSettings(env, settings) {
  await env.BOT_CONFIG.put("settings", JSON.stringify(settings));
}

// خواندن لاگ ارسال‌های امروز (جلوگیری از ارسال تکراری)
export async function getSentLog(env) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  try {
    const log = await env.BOT_CONFIG.get(key, "json");
    return log || [];
  } catch (e) {
    return [];
  }
}

// ذخیره لاگ ارسال
export async function addSentLog(env, timeStr) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  const log = await getSentLog(env);
  if (!log.includes(timeStr)) {
    log.push(timeStr);
    await env.BOT_CONFIG.put(key, JSON.stringify(log), { expirationTtl: 172800 });
  }
}
