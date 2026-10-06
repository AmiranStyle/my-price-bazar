// ==========================================
// 📈 موتور قیمت‌گیری با معماری خودترمیم (Self-Healing)
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';
import { sendErrorToAdmin } from './telegram.js';

// استخراج قیمت از TGJU
async function fetchFromTGJU(slug, label) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status} برای ${slug}`);
  const html = await response.text();
  const text = htmlToText(html);
  const targetLabel = label && label.trim() !== "" ? label : "نرخ فعلی";
  const price = extractNumberAfterLabel(text, targetLabel, 100);
  if (!price) throw new Error(`لیبل "${targetLabel}" در TGJU/${slug} پیدا نشد.`);
  return price;
}

// استخراج قیمت از Nobitex API
async function fetchFromNobitex(symbol) {
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${symbol}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("قیمت در پاسخ نوبیتکس (lastTradePrice) پیدا نشد.");
  return price;
}

// استخراج قیمت از Emofid
async function fetchFromEmofid(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  
  let price = null;
  if (label && label.trim() !== "") {
    price = extractNumberAfterLabel(text, label, 100);
  }
  if (!price) price = extractNumberAfterLabel(text, "قیمت آخرین معامله", 100);
  if (!price) price = extractNumberAfterLabel(text, "آخرین قیمت", 100);
  if (!price) price = extractNumberAfterLabel(text, "قیمت هر واحد", 100);
  if (!price) price = extractNumberAfterLabel(text, "آخرین معامله", 100);

  if (!price) throw new Error("قیمت در صفحه ایموفید با لیبل‌های مربوطه پیدا نشد.");
  return price;
}

// استخراج قیمت از آدرس سفارشی
async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 150);
  if (!price) throw new Error(`لیبل "${label}" در آدرس سفارشی پیدا نشد.`);
  return price;
}

// اجرای یک درخواست منبع
async function executeSource(type, slug, label) {
  switch (type) {
    case "tgju":
      return await fetchFromTGJU(slug, label);
    case "nobitex":
      return await fetchFromNobitex(slug);
    case "emofid":
      return await fetchFromEmofid(slug, label);
    case "custom":
      return await fetchFromCustom(slug, label);
    default:
      throw new Error(`نوع منبع ناشناخته: ${type}`);
  }
}

// دریافت قیمت یک نماد (با پشتیبانی از منبع اصلی + منبع رزرو)
export async function fetchSymbolPrice(symbol, env = null) {
  if (!symbol.enabled) return null;

  let rawPrice = null;
  let usedFallback = false;
  let primaryErrorMsg = "";

  // ۱. تست منبع اصلی
  try {
    rawPrice = await executeSource(symbol.source_type, symbol.source_slug, symbol.label);
  } catch (err) {
    primaryErrorMsg = err.message;
    console.warn(`[${symbol.name}] منبع اصلی ناموفق بود: ${primaryErrorMsg}`);

    // ۲. بررسی و فراخوانی منبع پشتیبان (Fallback)
    if (symbol.fallback_type && symbol.fallback_type !== "none" && symbol.fallback_slug) {
      try {
        console.log(`[${symbol.name}] در حال امتحان منبع پشتیبان (${symbol.fallback_type} / ${symbol.fallback_slug})...`);
        rawPrice = await executeSource(symbol.fallback_type, symbol.fallback_slug, symbol.fallback_label);
        usedFallback = true;
      } catch (fallbackErr) {
        console.error(`[${symbol.name}] منبع پشتیبان نیز خطا داد:`, fallbackErr.message);
        // گزارش به ادمین تلگرام در صورت خرابی هر دو منبع
        if (env && env.BOT_TOKEN) {
          await sendErrorToAdmin(
            env.BOT_TOKEN,
            env.ADMIN_USER_ID,
            `نماد: ${symbol.name}\nخطای منبع اول: ${primaryErrorMsg}\nخطای منبع پشتیبان: ${fallbackErr.message}`,
            "استخراج قیمت (هر دو منبع ناموفق بودند)"
          );
        }
        return null;
      }
    } else {
      // اگر منبع پشتیبان نداشت، فوراً گزارش خطا به تلگرام ادمین ارسال شود
      if (env && env.BOT_TOKEN) {
        await sendErrorToAdmin(
          env.BOT_TOKEN,
          env.ADMIN_USER_ID,
          `نماد: ${symbol.name}\nخطا: ${primaryErrorMsg}`,
          "استخراج قیمت (عدم وجود منبع پشتیبان)"
        );
      }
      return null;
    }
  }

  // تبدیل ریال به تومان
  const isRial = usedFallback ? symbol.fallback_is_rial : symbol.is_rial;
  let finalPrice = isRial ? rialToToman(rawPrice) : parseNumber(rawPrice);

  // اعتبارسنجی بازه مجاز
  if (!finalPrice || finalPrice < symbol.min || finalPrice > symbol.max) {
    const rangeError = `قیمت دریافت شده (${finalPrice}) خارج از محدوده مجاز (${symbol.min} تا ${symbol.max}) است.`;
    console.error(`[${symbol.name}] ${rangeError}`);
    if (env && env.BOT_TOKEN) {
      await sendErrorToAdmin(
        env.BOT_TOKEN,
        env.ADMIN_USER_ID,
        `نماد: ${symbol.name}\n${rangeError}`,
        "اعتبارسنجی بازه قیمت"
      );
    }
    return null;
  }

  return finalPrice;
}

// دریافت قیمت تمام نمادها
export async function fetchAllPrices(settings, env = null) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  const results = await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol, env)
    }))
  );
  return results;
}
