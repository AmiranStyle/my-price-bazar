// ==========================================
// 📈 موتور قیمت‌گیری داینامیک، بدون فریز و خودترمیم
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';
import { sendErrorToAdmin } from './telegram.js';

// ۱. استخراج از TGJU
async function fetchFromTGJU(slug, label) {
  const cleanSlug = slug.split("?")[0].replace(/^\/|\/$/g, "");
  const response = await fetch(`https://www.tgju.org/profile/${cleanSlug}?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status} برای ${cleanSlug}`);
  const html = await response.text();
  const text = htmlToText(html);
  const targetLabel = label && label.trim() !== "" ? label : "نرخ فعلی";
  const price = extractNumberAfterLabel(text, targetLabel, 100);
  if (!price) throw new Error(`لیبل "${targetLabel}" در TGJU/${cleanSlug} پیدا نشد.`);
  return price;
}

// ۲. استخراج دقیق قیمت عیار از سایت رسمی ایموفید (۷۱۸,۰۵۲ ریال)
async function fetchFromEmofid(url, label) {
  const targetUrl = (url && url.startsWith("http")) ? url.split("?")[0] : "https://www.emofid.com/funds/ayar/";
  const response = await fetch(`${targetUrl}?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);

  // جستجوی برچسب‌های واقعی سایت مفید: قیمت صدور، قیمت ابطال، قیمت هر واحد
  const labels = [
    label,
    "قیمت صدور",
    "قیمت ابطال",
    "قیمت هر واحد",
    "آخرین قیمت",
    "قیمت آخرین معامله"
  ].filter(Boolean);

  for (const l of labels) {
    const price = extractNumberAfterLabel(text, l, 80);
    if (price && price > 10000) {
      return price;
    }
  }

  throw new Error("قیمت زنده در صفحه ایموفید پیدا نشد.");
}

// ۳. استخراج قیمت تتر از نوبیتکس
async function fetchFromNobitex(symbol) {
  const cleanSymbol = (symbol || "USDTIRT").trim().toUpperCase();
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${cleanSymbol}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("lastTradePrice در نوبیتکس پیدا نشد.");
  return price;
}

// ۴. استخراج از صفحه سفارشی
async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 150);
  if (!price) throw new Error(`لیبل "${label}" پیدا نشد.`);
  return price;
}

// ۵. انتخاب خودکار منبع
async function executeSource(type, slug, label, symbolId) {
  // صندوق عیار همیشه مستقیماً از ایموفید دریافت می‌شود
  if (symbolId === "ayar" || (slug && slug.includes("ayar"))) {
    return await fetchFromEmofid(slug, label);
  }

  switch (type) {
    case "emofid":
      return await fetchFromEmofid(slug, label);
    case "nobitex":
      return await fetchFromNobitex(slug);
    case "tgju":
      return await fetchFromTGJU(slug, label);
    case "custom":
      return await fetchFromCustom(slug, label);
    default:
      throw new Error(`نوع منبع ناشناخته: ${type}`);
  }
}

// ۶. متد اصلی دریافت و تبدیل قیمت
export async function fetchSymbolPrice(symbol, env = null) {
  if (!symbol.enabled) return null;

  let rawPrice = null;
  let usedFallback = false;
  let firstError = "";

  // منبع اصلی
  try {
    rawPrice = await executeSource(symbol.source_type, symbol.source_slug, symbol.label, symbol.id);
  } catch (err) {
    firstError = err.message;
    console.warn(`[${symbol.name}] خطا در منبع اول: ${firstError}`);

    // منبع پشتیبان
    if (symbol.fallback_type && symbol.fallback_type !== "none" && symbol.fallback_slug) {
      try {
        rawPrice = await executeSource(symbol.fallback_type, symbol.fallback_slug, symbol.fallback_label, symbol.id);
        usedFallback = true;
      } catch (fallbackErr) {
        console.error(`[${symbol.name}] خطا در منبع پشتیبان: ${fallbackErr.message}`);
        if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
          await sendErrorToAdmin(
            env.BOT_TOKEN,
            env.ADMIN_USER_ID,
            `نماد: ${symbol.name}\nخطای اول: ${firstError}\nخطای دوم: ${fallbackErr.message}`,
            "استخراج ناموفق هر دو منبع"
          );
        }
        return null;
      }
    } else {
      if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
        await sendErrorToAdmin(
          env.BOT_TOKEN,
          env.ADMIN_USER_ID,
          `نماد: ${symbol.name}\nخطا: ${firstError}`,
          "استخراج بدون منبع پشتیبان"
        );
      }
      return null;
    }
  }

  // تبدیل قطعی و اجباری ریال به تومان:
  // برای عیار و تتر اگر عدد بالای ۱۰۰ هزار بود، ۱۰۰٪ ریال است و باید تقسیم بر ۱۰ شود
  let isRial = (symbol.is_rial === true || symbol.is_rial === "true");
  if (usedFallback) {
    isRial = (symbol.fallback_is_rial === true || symbol.fallback_is_rial === "true" || isRial);
  }
  if (symbol.id === "ayar" && rawPrice > 100000) {
    isRial = true; // تبدیل اجباری ریال به تومان برای عیار
  }
  if (symbol.id === "usdt" && rawPrice > 100000) {
    isRial = true; // تبدیل اجباری ریال به تومان برای تتر
  }
  if (symbol.id === "gold18" && rawPrice > 100000000) {
    isRial = true;
  }

  let finalPrice = isRial ? rialToToman(rawPrice) : parseNumber(rawPrice);

  // بررسی بازه مجاز
  if (!finalPrice || finalPrice < symbol.min || finalPrice > symbol.max) {
    const rangeMsg = `قیمت دریافت شده (${finalPrice}) خارج از محدوده مجاز است (${symbol.min} تا ${symbol.max})`;
    console.error(`[${symbol.name}] ${rangeMsg}`);
    if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
      await sendErrorToAdmin(env.BOT_TOKEN, env.ADMIN_USER_ID, `نماد: ${symbol.name}\n${rangeMsg}`, "اعتبارسنجی قیمت");
    }
    return null;
  }

  return finalPrice;
}

// استخراج کلیه نمادها
export async function fetchAllPrices(settings, env = null) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  return await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol, env)
    }))
  );
}
