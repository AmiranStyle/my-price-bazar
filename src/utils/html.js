// ==========================================
// 🌐 ابزارهای پارسینگ HTML
// ==========================================

// هدرهای مرورگر برای دور زدن محدودیت‌ها
export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};

// تبدیل HTML به متن ساده
export function htmlToText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// استخراج عدد بعد از یک لیبل مشخص
export function extractNumberAfterLabel(text, label, maxChars = 120) {
  if (!text || !label) return null;
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escapedLabel}\\s*[:：:]*\\s*([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬\\. ]{0,${maxChars}})`,
    "i"
  );
  const match = text.match(pattern);
  if (!match || !match[1]) return null;
  const numberMatch = match[1].match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٠-٩,٬]*/);
  if (!numberMatch) return null;

  // فراخوانی تابع کمکی از همین فایل
  const { parseNumber } = require('./helpers.js');
  return parseNumber(numberMatch[0]);
}
