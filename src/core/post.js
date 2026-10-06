// ==========================================
// 📬 ساخت و ارسال پست به کانال
// ==========================================

import { formatFa } from '../utils/helpers.js';
import { getTehranDateTime } from '../utils/datetime.js';
import { fetchAllPrices } from '../services/priceEngine.js';
import { getDefaultSettings } from '../config/defaults.js';

// ساخت متن کپشن با قیمت‌های لحظه‌ای
export async function generateCaption(settings, priceResults) {
  const { dateStr, timeStr } = getTehranDateTime();

  // ساخت بخش قیمت‌ها از روی نمادهای فعال
  const priceLines = priceResults
    .filter(r => r.price !== null)
    .map(r => `${r.symbol.emoji || "📌"} <b>${r.symbol.name}:</b> ${formatFa(r.price)} تومان`)
    .join("\n");

  if (!priceLines) {
    throw new Error("هیچ قیمتی با موفقیت دریافت نشد.");
  }

  // جایگزینی متغیرها در قالب کپشن
  let caption = settings.caption_template || getDefaultSettings().caption_template;
  caption = caption
    .replace(/\{date\}/g, dateStr)
    .replace(/\{time\}/g, timeStr)
    .replace(/\{prices\}/g, priceLines)
    .replace(/\{channel\}/g, settings.channel_id);

  return caption;
}

// ارسال عکس + کپشن به کانال
export async function sendPostToChannel(botToken, settings) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");

  const priceResults = await fetchAllPrices(settings);
  const caption = await generateCaption(settings, priceResults);

  const payload = {
    chat_id: settings.channel_id,
    photo: settings.photo_url,
    caption: caption,
    parse_mode: "HTML"
  };

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  if (!result.ok) throw new Error(`Telegram API Error: ${result.description}`);
  return result;
}
