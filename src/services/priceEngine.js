// ==========================================
// 📈 موتور قیمت‌گیری داینامیک، ۴ لایه و خودترمیم
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';
import { sendErrorToAdmin } from './telegram.js';

// ------------------------------------------
// ۱. متدهای استخراج عمومی
// ------------------------------------------

// استخراج عمومی از TGJU
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

// استخراج تتر از نوبیتکس
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

// استخراج از صفحه سفارشی
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


// ------------------------------------------
// ۲. زنجیره ۴ لایه اختصاصی صندوق عیار
// ------------------------------------------

// لایه ۱: استخراج عیار از ایموفید
async function fetchAyarFromEmofid() {
  const response = await fetch(`https://www.emofid.com/funds/ayar/?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);

  const labels = ["قیمت صدور", "قیمت ابطال", "قیمت هر واحد", "آخرین قیمت", "قیمت آخرین معامله"];
  for (const l of labels) {
    const price = extractNumberAfterLabel(text, l, 80);
    if (price && price > 10000) return price;
  }
  throw new Error("قیمت در صفحه ایموفید یافت نشد.");
}

// لایه ۲: استخراج عیار از TGJU نماد gc3 (لیبل: نرخ فعلی)
async function fetchAyarFromTgjuGc3() {
  const response = await fetch(`https://www.tgju.org/profile/gc3?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TGJU gc3 HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);

  // جستجوی دقیق لیبل نرخ فعلی
  const price = extractNumberAfterLabel(text, "نرخ فعلی", 80);
  if (price && price > 10000) return price;

  throw new Error("نرخ فعلی در صفحه TGJU gc3 یافت نشد.");
}

// لایه ۳: استخراج عیار از TGJU نماد ime_fund_ayar (لیبل: نرخ فعلی)
async function fetchAyarFromTgjuIme() {
  const response = await fetch(`https://www.tgju.org/profile/ime_fund_ayar?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TGJU ime_fund_ayar HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);

  const price = extractNumberAfterLabel(text, "نرخ فعلی", 80);
  if (price && price > 10000) return price;

  throw new Error("نرخ فعلی در TGJU ime_fund_ayar یافت نشد.");
}

// لایه ۴: استخراج عیار از CDN رسمی بورس تهران (TSETMC)
async function fetchAyarFromTsetmc() {
  const response = await fetch(`https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/IRO9AYAR0001/1?_t=${Date.now()}`, {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      "Accept": "application/json"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TSETMC HTTP ${response.status}`);
  const data = await response.json();
  const item = data?.closingPriceDaily?.[0];
  const price = item?.pDrCotVal || item?.pClosing;
  if (!price) throw new Error("قیمت در داده‌های TSETMC خالی بود.");
  return Number(price);
}

// اجرای زنجیره خودترمیم عیار (به ترتیب اولویت)
async function fetchAyarPriceChain() {
  const errors = [];

  // اولویت ۱: ایموفید
  try {
    return await fetchAyarFromEmofid();
  } catch (e) {
    errors.push(`ایموفید: ${e.message}`);
    console.warn("ایموفید ناموفق بود، سوئیچ به TGJU gc3...");
  }

  // اولویت ۲: TGJU gc3
  try {
    return await fetchAyarFromTgjuGc3();
  } catch (e) {
    errors.push(`TGJU gc3: ${e.message}`);
    console.warn("TGJU gc3 ناموفق بود، سوئیچ به TGJU ime_fund_ayar...");
  }

  // اولویت ۳: TGJU ime_fund_ayar
  try {
    return await fetchAyarFromTgjuIme();
  } catch (e) {
    errors.push(`TGJU ime: ${e.message}`);
    console.warn("TGJU ime ناموفق بود، سوئیچ به TSETMC بورس...");
  }

  // اولویت ۴: TSETMC بورس
  try {
    return await fetchAyarFromTsetmc();
  } catch (e) {
    errors.push(`TSETMC بورس: ${e.message}`);
  }

  // اگر تمام ۴ لایه با شکست مواجه شدند
  throw new Error(`شکست در تمام ۴ منبع عیار:\n` + errors.join("\n"));
}


// ------------------------------------------
// ۳. هدایت‌کننده هوشمند منبع
// ------------------------------------------

async function executeSource(type, slug, label, symbolId) {
  // اگر نماد عیار بود، زنجیره ۴ لایه را اجرا کن
  if (symbolId === "ayar" || (slug && (slug.includes("ayar") || slug === "gc3"))) {
    return await fetchAyarPriceChain();
  }

  switch (type) {
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


// ------------------------------------------
// ۴. تابع اصلی دریافت و اعتبارسنجی قیمت نماد
// ------------------------------------------

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

  // تبدیل هوشمند ریال به تومان
  let isRial = (symbol.is_rial === true || symbol.is_rial === "true");
  if (usedFallback) {
    isRial = (symbol.fallback_is_rial === true || symbol.fallback_is_rial === "true" || isRial);
  }
  // محافظت قطعی: برای عیار و تتر اگر عدد بالای ۱۰۰ هزار بود، ۱۰۰٪ ریال است
  if (symbol.id === "ayar" && rawPrice > 100000) {
    isRial = true;
  }
  if (symbol.id === "usdt" && rawPrice > 100000) {
    isRial = true;
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

// استخراج تمام نمادهای فعال
export async function fetchAllPrices(settings, env = null) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  return await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol, env)
    }))
  );
}
